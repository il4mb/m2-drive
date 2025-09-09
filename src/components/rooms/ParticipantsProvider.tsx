'use client'

import React, { ComponentProps, ComponentPropsWithRef, ElementType, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCurrentSession } from '../context/CurrentSessionProvider';
import User from '@/entities/User';
import { useRoom } from './RoomProvider';

import { getMany } from '@/libs/websocket/query';
import { onSnapshot } from '@/libs/websocket/snapshot';
import { alpha, Box, Stack, useTheme } from '@mui/material';
import { AnimatePresence } from 'motion/react';
import Participant from './components/Participant';

type Position = {
    x: number;
    y: number;
    scrollX: number;
    scrollY: number;
}

type ParticipantData = {
    user?: User;
    position?: Position;
    viewport?: {
        width: number;
        height: number;
    };
    selection?: {
        text: string;
        rect: DOMRect;
        elementType?: 'textarea' | 'input' | 'contenteditable' | 'normal';
    };
    lastUpdate?: number;
};

export interface ParticipantsTrackingProps<T extends ElementType = typeof Stack> {
    children?: ReactNode;
    container?: T;
    containerProps?: ComponentPropsWithRef<T>;
}

export default function ParticipantsProvider({ children, container, containerProps }: ParticipantsTrackingProps) {
    const Container = container || Stack;
    const theme = useTheme();
    const session = useCurrentSession();
    const { data, updateMyData } = useRoom<any>();
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollableElementsRef = useRef<Set<HTMLElement>>(new Set());

    const myId = useMemo(() => session?.user?.id, [session]);
    const [myPosition, setMyPosition] = useState<Position>({ x: 0, y: 0, scrollX: 0, scrollY: 0 });
    const [participants, setParticipants] = useState<ParticipantData[]>([]);
    const [myViewport, setMyViewport] = useState({ width: 0, height: 0 });
    const [totalScroll, setTotalScroll] = useState({ scrollX: 0, scrollY: 0 });
    const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

    // Update container rectangle
    const updateContainerRect = useCallback(() => {
        if (containerRef.current) {
            setContainerRect(containerRef.current.getBoundingClientRect());
        }
    }, []);

    // Find all scrollable elements within the container
    const findScrollableElements = useCallback((element: HTMLElement): HTMLElement[] => {
        const scrollables: HTMLElement[] = [];

        // Check if current element is scrollable
        const style = getComputedStyle(element);
        const isScrollable = (
            element.scrollHeight > element.clientHeight ||
            element.scrollWidth > element.clientWidth
        ) && (
                style.overflow === 'auto' ||
                style.overflow === 'scroll' ||
                style.overflowY === 'auto' ||
                style.overflowY === 'scroll' ||
                style.overflowX === 'auto' ||
                style.overflowX === 'scroll'
            );

        if (isScrollable && element !== containerRef.current) {
            scrollables.push(element);
        }

        // Recursively check children
        for (const child of Array.from(element.children)) {
            if (child instanceof HTMLElement) {
                scrollables.push(...findScrollableElements(child));
            }
        }

        return scrollables;
    }, []);

    // Track scroll position of all scrollable elements
    const updateTotalScroll = useCallback(() => {
        if (!containerRef.current) return;

        let totalScrollX = containerRef.current.scrollLeft;
        let totalScrollY = containerRef.current.scrollTop;

        // Add scroll from all nested scrollable elements
        scrollableElementsRef.current.forEach(element => {
            totalScrollX += element.scrollLeft;
            totalScrollY += element.scrollTop;
        });

        setTotalScroll({ scrollX: totalScrollX, scrollY: totalScrollY });
        return { scrollX: totalScrollX, scrollY: totalScrollY };
    }, []);

    // Setup scroll listeners for all scrollable elements
    useEffect(() => {
        if (!containerRef.current) return;

        const updateScrollables = () => {
            if (!containerRef.current) return;

            // Find all scrollable elements
            const scrollables = findScrollableElements(containerRef.current);
            scrollableElementsRef.current = new Set(scrollables);

            // Add scroll listeners to all scrollable elements
            const scrollHandlers: Map<HTMLElement, () => void> = new Map();

            scrollables.forEach(element => {
                const handler = () => updateTotalScroll();
                element.addEventListener('scroll', handler, { passive: true });
                scrollHandlers.set(element, handler);
            });

            // Initial scroll calculation
            updateTotalScroll();

            return () => {
                // Cleanup listeners
                scrollHandlers.forEach((handler, element) => {
                    element.removeEventListener('scroll', handler);
                });
            };
        };

        // Initial setup
        const cleanup = updateScrollables();

        // Observe DOM changes to detect new scrollable elements
        const observer = new MutationObserver(updateScrollables);
        observer.observe(containerRef.current, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        return () => {
            cleanup?.();
            observer.disconnect();
        };
    }, [findScrollableElements, updateTotalScroll]);

    // Track viewport size and container position
    useEffect(() => {
        if (!containerRef.current) return;

        const updateViewport = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const newViewport = {
                    width: rect.width,
                    height: rect.height
                };
                setMyViewport(newViewport);
                updateMyData({
                    viewport: newViewport,
                    position: myPosition
                });
                setContainerRect(rect);
            }
        };

        updateViewport();
        window.addEventListener('resize', updateViewport);
        window.addEventListener('scroll', updateViewport, true);

        return () => {
            window.removeEventListener('resize', updateViewport);
            window.removeEventListener('scroll', updateViewport, true);
        };
    }, [updateMyData, myPosition]);

    // Initial mouse position setup
    useEffect(() => {
        function handleInitialMouseMove(e: MouseEvent) {
            if (!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const { scrollX, scrollY } = updateTotalScroll() || { scrollX: 0, scrollY: 0 };

            const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left + scrollX));
            const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top + scrollY));

            setMyPosition({ x, y, scrollX, scrollY });
            updateContainerRect();

            window.removeEventListener('mousemove', handleInitialMouseMove);
        }

        window.addEventListener('mousemove', handleInitialMouseMove, { passive: true });
        return () => window.removeEventListener('mousemove', handleInitialMouseMove);
    }, [updateTotalScroll, updateContainerRect]);

    // Load participants data
    useEffect(() => {
        const userIds = Object.keys(data || {});
        if (userIds.length === 0) {
            setParticipants([]);
            return;
        }

        const query = getMany("user").where("id", "IN", userIds);
        const unsubscribe = onSnapshot(query, (users: User[]) => {
            const now = Date.now();
            setParticipants(prev => {
                const updatedParticipants = users.map(user => {
                    const existing = prev.find(p => p.user?.id === user.id);
                    // @ts-ignore
                    const participantData = session?.user?.id ? (data[session.user.id] || {}) : {};

                    return {
                        user,
                        position: participantData.position || { x: 0, y: 0, scrollX: 0, scrollY: 0 },
                        viewport: participantData.viewport || { width: 0, height: 0 },
                        selection: participantData.selection,
                        lastUpdate: existing?.lastUpdate || now
                    };
                });

                return updatedParticipants.filter(p => userIds.includes(p.user?.id || ''));
            });
        });

        return unsubscribe;
    }, [data]);

    // Share my position and viewport
    useEffect(() => {
        updateMyData({
            position: myPosition,
            viewport: myViewport
        });
    }, [myPosition, myViewport, updateMyData]);

    const getColorFromId = (id?: string) => {
        if (!id) return theme.palette.primary.main;
        const colors = [
            theme.palette.primary.main,
            theme.palette.secondary.main,
            theme.palette.success.main,
            theme.palette.warning.main,
            theme.palette.error.main,
            theme.palette.info.main,
        ];
        const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
        return colors[index];
    };

    // Convert participant's position from their viewport to my viewport with proper aspect ratio handling
    const convertToMyViewport = useCallback((participant: ParticipantData) => {
        if (!containerRect || !participant.position || !participant.viewport) return null;

        const theirViewport = participant.viewport;
        const myViewportSize = { width: containerRect.width, height: containerRect.height };

        // If participant hasn't shared their viewport size yet, use default positioning
        if (theirViewport.width === 0 || theirViewport.height === 0) {
            const viewportX = participant.position.x - totalScroll.scrollX;
            const viewportY = participant.position.y - totalScroll.scrollY;

            const isVisible = (
                viewportX >= 0 &&
                viewportY >= 0 &&
                viewportX <= myViewportSize.width &&
                viewportY <= myViewportSize.height
            );

            return {
                viewportX: viewportX + containerRect.left,
                viewportY: viewportY + containerRect.top,
                isVisible,
                scale: 1
            };
        }

        // Calculate relative position in their viewport (0-1 range)
        const relativeX = participant.position.x / theirViewport.width;
        const relativeY = participant.position.y / theirViewport.height;

        // Convert relative position to my viewport coordinates
        const myX = relativeX * myViewportSize.width;
        const myY = relativeY * myViewportSize.height;

        // Adjust for my current scroll position
        const viewportX = myX - totalScroll.scrollX;
        const viewportY = myY - totalScroll.scrollY;

        // Check if the position is within my visible viewport
        const isVisible = (
            viewportX >= 0 &&
            viewportY >= 0 &&
            viewportX <= myViewportSize.width &&
            viewportY <= myViewportSize.height
        );

        // Convert to absolute screen coordinates
        const absoluteX = viewportX + containerRect.left;
        const absoluteY = viewportY + containerRect.top;

        // Calculate scale based on viewport size difference
        const scale = Math.min(
            myViewportSize.width / theirViewport.width,
            myViewportSize.height / theirViewport.height
        );

        return {
            viewportX: absoluteX,
            viewportY: absoluteY,
            isVisible,
            scale
        };
    }, [containerRect, totalScroll]);

    const getEdgeIndicatorPosition = useCallback((participant: ParticipantData) => {
        const viewportInfo = convertToMyViewport(participant);
        if (!viewportInfo || viewportInfo.isVisible || !containerRect) return null;

        const { viewportX, viewportY } = viewportInfo;

        // Calculate direction from center of my viewport
        const centerX = containerRect.width / 2 + containerRect.left;
        const centerY = containerRect.height / 2 + containerRect.top;

        const dx = viewportX - centerX;
        const dy = viewportY - centerY;

        // Calculate angle for arrow direction
        const angle = Math.atan2(dy, dx);

        // Find intersection point with viewport edge
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) return null; // Prevent division by zero

        const normalizedDx = dx / length;
        const normalizedDy = dy / length;

        // Calculate intersection with container edges
        const padding = 30;

        // Calculate the maximum distance to edge in both directions
        const maxX = normalizedDx > 0 ? containerRect.right - centerX : centerX - containerRect.left;
        const maxY = normalizedDy > 0 ? containerRect.bottom - centerY : centerY - containerRect.top;

        // Use the smaller ratio to find the edge intersection
        const ratioX = maxX / Math.abs(normalizedDx);
        const ratioY = maxY / Math.abs(normalizedDy);
        const minRatio = Math.min(ratioX, ratioY);

        const edgeX = centerX + normalizedDx * (minRatio - padding);
        const edgeY = centerY + normalizedDy * (minRatio - padding);

        return {
            x: edgeX,
            y: edgeY,
            angle: angle * 180 / Math.PI + 90 // Convert to degrees and adjust for arrow orientation
        };
    }, [convertToMyViewport, containerRect]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const { scrollX: totalScrollX, scrollY: totalScrollY } = updateTotalScroll() || { scrollX: 0, scrollY: 0 };

        // Calculate absolute document coordinates
        const absoluteX = e.clientX - rect.left + totalScrollX;
        const absoluteY = e.clientY - rect.top + totalScrollY;

        // Constrain to document boundaries
        const documentWidth = containerRef.current.scrollWidth;
        const documentHeight = containerRef.current.scrollHeight;

        const x = Math.max(0, Math.min(documentWidth, absoluteX));
        const y = Math.max(0, Math.min(documentHeight, absoluteY));

        setMyPosition({ x, y, scrollX: totalScrollX, scrollY: totalScrollY });
        updateContainerRect();
    }, [updateTotalScroll, updateContainerRect]);

    const handleScroll = useCallback(() => {
        updateTotalScroll();
        updateContainerRect();
    }, [updateTotalScroll, updateContainerRect]);

    return (
        <Container
            flex={1}
            ref={containerRef}
            {...containerProps}
            component={Container}
            onMouseMove={handleMouseMove}
            onScroll={handleScroll}
            sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                overflow: 'auto',
                '&::-webkit-scrollbar': {
                    width: 8,
                    height: 8,
                },
                '&::-webkit-scrollbar-track': {
                    background: alpha(theme.palette.background.paper, 0.1),
                },
                '&::-webkit-scrollbar-thumb': {
                    background: alpha(theme.palette.text.primary, 0.2),
                    borderRadius: 4,
                },
                ...containerProps?.sx
            }}
        >
            {children}

            {/* Participants Overlay */}
            <Box
                sx={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    zIndex: 1000,
                    pointerEvents: 'none'
                }}
            >
                <AnimatePresence>
                    {participants.map((participant, i) => {
                        const isMe = participant.user?.id === myId;
                        if (isMe) return null;

                        const userColor = getColorFromId(participant.user?.id);
                        const viewportInfo = convertToMyViewport(participant);

                        if (!viewportInfo) return null;

                        if (viewportInfo.isVisible) {
                            // Participant is visible - show normal cursor
                            return (
                                <Participant
                                    key={participant.user?.id || i}
                                    user={participant.user}
                                    isMe={isMe}
                                    color={userColor}
                                    x={viewportInfo.viewportX}
                                    y={viewportInfo.viewportY}
                                // scale={viewportInfo.scale}
                                />
                            );
                        } else {
                            // Participant is off-screen - show edge indicator
                            const edgePos = getEdgeIndicatorPosition(participant);
                            if (!edgePos) return null;

                            return (
                                <Participant
                                    key={participant.user?.id || i}
                                    user={participant.user}
                                    isMe={isMe}
                                    color={userColor}
                                    x={edgePos.x}
                                    y={edgePos.y}
                                    isEdgeIndicator={true}
                                    edgeAngle={edgePos.angle}
                                />
                            );
                        }
                    })}
                </AnimatePresence>
            </Box>
        </Container>
    );
}