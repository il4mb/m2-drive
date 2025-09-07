'use client'

import { useRoom } from '@/components/rooms/RoomProvider';
import User from '@/entity/User';
import { getMany } from '@/libs/websocket/query';
import { onSnapshot } from '@/libs/websocket/snapshot';
import { Avatar, Box, Chip, Stack, Typography, useTheme, alpha, Paper } from '@mui/material';
import { ReactNode, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrentSession } from '@/components/context/CurrentSessionProvider';
import UserAvatar from '@/components/ui/UserAvatar';
import { MousePointer2 } from 'lucide-react';
import Participant from '@/components/rooms/components/Participant';

type Participant = {
    user?: User;
    position?: {
        x: number;
        y: number;
    };
    scrollPosition?: {
        scrollX: number;
        scrollY: number;
    };
    selection?: {
        text: string;
        rect: DOMRect;
        elementType?: 'textarea' | 'input' | 'contenteditable' | 'normal';
    };
    lastUpdate?: number;
};

export interface LayoutProps {
    children?: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const { user } = useCurrentSession();
    const [participants, setParticipants] = useState<Participant[]>([]);
    const { data, updateMyData } = useRoom<any>();
    const myId = useMemo(() => user?.id, [user]);
    const theme = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const selectionCheckRef = useRef<NodeJS.Timeout>(null);

    useEffect(() => {
        const userIds = Object.keys(data);
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
                    return {
                        user,
                        position: data[user.id]?.position || { x: 0, y: 0 },
                        scrollPosition: data[user.id]?.scrollPosition || { scrollX: 0, scrollY: 0 },
                        selection: data[user.id]?.selection,
                        lastUpdate: existing?.lastUpdate || now
                    };
                });

                return updatedParticipants.filter(p => userIds.includes(p.user?.id || ''));
            });
        });

        return unsubscribe;
    }, [data]);

    const handleScroll = useCallback(() => {
        if (!containerRef.current) return;

        const scrollX = containerRef.current.scrollLeft;
        const scrollY = containerRef.current.scrollTop;

        updateMyData({ scrollPosition: { scrollX, scrollY } });
    }, [updateMyData]);

    // Track text selection in textareas and inputs
    const trackFormElementSelection = useCallback((element: HTMLTextAreaElement | HTMLInputElement) => {
        if (element.selectionStart === element.selectionEnd) {
            return null;
        }

        const text = element.value.substring(element.selectionStart, element.selectionEnd);
        const rect = element.getBoundingClientRect();

        // Calculate approximate position of selection within the element
        const fontSize = parseInt(getComputedStyle(element).fontSize) || 16;
        const lineHeight = parseInt(getComputedStyle(element).lineHeight) || fontSize * 1.2;

        const lines = element.value.substring(0, element.selectionStart).split('\n');
        const currentLine = lines.length - 1;
        const currentLineText = lines[currentLine] || '';

        const selectionRect = {
            left: rect.left + (currentLineText.length * fontSize * 0.6), // Approximate char width
            top: rect.top + (currentLine * lineHeight),
            width: text.length * fontSize * 0.6,
            height: lineHeight,
            right: 0,
            bottom: 0,
            x: 0,
            y: 0,
            toJSON: () => ({})
        } as DOMRect;

        return {
            text,
            rect: selectionRect,
            elementType: element.tagName.toLowerCase() as 'textarea' | 'input'
        };
    }, []);

    // Track selection in contenteditable elements
    const trackContentEditableSelection = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.rangeCount) {
            return null;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        if (rect.width > 0 && rect.height > 0) {
            return {
                text: selection.toString(),
                rect,
                elementType: 'contenteditable' as const
            };
        }
        return null;
    }, []);

    // Track normal text selection
    const trackNormalSelection = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.rangeCount) {
            return null;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        if (rect.width > 0 && rect.height > 0) {
            return {
                text: selection.toString(),
                rect,
                elementType: 'normal' as const
            };
        }
        return null;
    }, []);

    const trackSelection = useCallback(() => {
        const activeElement = document.activeElement;

        // Check for textarea and input selections
        if (activeElement instanceof HTMLTextAreaElement || activeElement instanceof HTMLInputElement) {
            const selection = trackFormElementSelection(activeElement);
            updateMyData({ selection });
            return;
        }

        // Check for contenteditable elements
        if (activeElement?.isContentEditable) {
            const selection = trackContentEditableSelection();
            updateMyData({ selection });
            return;
        }

        // Check for normal text selection
        const selection = trackNormalSelection();
        updateMyData({ selection });
    }, [updateMyData, trackFormElementSelection, trackContentEditableSelection, trackNormalSelection]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const scrollX = containerRef.current.scrollLeft;
        const scrollY = containerRef.current.scrollTop;

        const x = Math.max(0, Math.min(rect.width - 50, e.clientX - rect.left + scrollX));
        const y = Math.max(0, Math.min(rect.height - 50, e.clientY - rect.top + scrollY));

        updateMyData({
            position: { x, y },
            scrollPosition: { scrollX, scrollY }
        });

        if (selectionCheckRef.current) {
            clearTimeout(selectionCheckRef.current);
        }
        selectionCheckRef.current = setTimeout(trackSelection, 100);
    }, [updateMyData, trackSelection]);

    // Add event listeners for textarea/input selection changes
    useEffect(() => {
        const handleInputSelection = () => {
            trackSelection();
        };

        // Listen for selection events in form elements
        document.addEventListener('selectionchange', handleInputSelection);
        document.addEventListener('click', handleInputSelection);
        document.addEventListener('keyup', handleInputSelection);
        document.addEventListener('mouseup', handleInputSelection);

        return () => {
            document.removeEventListener('selectionchange', handleInputSelection);
            document.removeEventListener('click', handleInputSelection);
            document.removeEventListener('keyup', handleInputSelection);
            document.removeEventListener('mouseup', handleInputSelection);
        };
    }, [trackSelection]);

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

    const getRelativePosition = useCallback((participant: Participant) => {
        if (!containerRef.current || !participant.position) return { x: 0, y: 0 };

        const containerRect = containerRef.current.getBoundingClientRect();
        const scrollX = participant.scrollPosition?.scrollX || 0;
        const scrollY = participant.scrollPosition?.scrollY || 0;

        return {
            x: participant.position.x - scrollX + containerRect.left,
            y: participant.position.y - scrollY + containerRect.top
        };
    }, []);

    const getSelectionPosition = useCallback((selection: any) => {
        if (!containerRef.current || !selection) return null;

        const containerRect = containerRef.current.getBoundingClientRect();
        return {
            left: selection.rect.left - containerRect.left + containerRef.current.scrollLeft,
            top: selection.rect.top - containerRect.top + containerRef.current.scrollTop,
            width: selection.rect.width,
            height: selection.rect.height
        };
    }, []);

    return (
        <Stack
            ref={containerRef}
            flex={1}
            onMouseMove={handleMouseMove}
            onScroll={handleScroll}
            sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                cursor: 'none',
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
            }}
        >
            {children}

            {/* Selection Highlights */}
            <AnimatePresence>
                {participants.map(participant => {
                    if (!participant.selection || participant.user?.id === myId) return null;

                    const selectionPos = getSelectionPosition(participant.selection);
                    if (!selectionPos) return null;

                    const userColor = getColorFromId(participant.user?.id);

                    return (
                        <motion.div
                            key={`selection-${participant.user?.id}`}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            style={{
                                position: 'absolute',
                                left: selectionPos.left,
                                top: selectionPos.top,
                                width: Math.max(selectionPos.width, 2),
                                height: Math.max(selectionPos.height, 2),
                                backgroundColor: alpha(userColor, 0.2),
                                border: `1px solid ${userColor}`,
                                borderRadius: 2,
                                pointerEvents: 'none',
                                zIndex: 999,
                            }}>
                            <Paper
                                sx={{
                                    position: 'absolute',
                                    top: -28,
                                    left: 0,
                                    px: 1,
                                    py: 0.5,
                                    bgcolor: userColor,
                                    color: 'white',
                                    fontSize: '0.7rem',
                                    fontWeight: 500,
                                    borderRadius: 1.5,
                                    whiteSpace: 'nowrap',
                                }}>
                                {participant.user?.name}
                                {participant.selection.elementType && (
                                    <Typography component="span" variant="caption" sx={{ ml: 0.5, opacity: 0.8 }}>
                                        ({participant.selection.elementType})
                                    </Typography>
                                )}
                            </Paper>
                        </motion.div>
                    );
                })}
            </AnimatePresence>

            {/* Participants Overlay */}
            <Box sx={{
                position: "fixed",
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 1000,
                pointerEvents: 'none'
            }}>
                <AnimatePresence>
                    {participants.map((participant, i) => {
                        const isMe = participant.user?.id === myId;
                        const userColor = getColorFromId(participant.user?.id);
                        const relativePos = getRelativePosition(participant);

                        return (
                            <Participant
                                key={participant.user?.id || i}
                                user={participant.user}
                                color={userColor}
                                x={relativePos.x}
                                y={relativePos.y} />
                        )

                        return (
                            <motion.div
                                key={participant.user?.id}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{
                                    scale: 1,
                                    opacity: 1,
                                    x: relativePos.x,
                                    y: relativePos.y
                                }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{
                                    type: "spring",
                                    damping: 25,
                                    stiffness: 400
                                }}
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: isMe ? 1112 : 1001
                                }}>
                                <Stack
                                    alignItems="center"
                                    spacing={0.5}
                                    sx={{
                                        filter: isMe ? 'drop-shadow(0 0 12px rgba(0,0,0,0.4))' : 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
                                        transition: 'all 0.2s ease'
                                    }}>

                                    <MousePointer2 />
                                    <UserAvatar
                                        disableIndicator
                                        user={participant.user}
                                        sx={{
                                            width: 44,
                                            height: 44,
                                            bgcolor: userColor,
                                            border: `3px solid ${isMe ? theme.palette.primary.main : alpha(userColor, 0.4)}`,
                                            boxShadow: theme.shadows[4],
                                            fontSize: '1rem',
                                            fontWeight: 600
                                        }}
                                    />

                                    <Chip
                                        label={participant.user?.name || 'Unknown'}
                                        size="small"
                                        sx={{
                                            bgcolor: alpha(userColor, 0.95),
                                            color: 'white',
                                            fontWeight: 600,
                                            fontSize: '0.7rem',
                                            height: 22,
                                            '& .MuiChip-label': { px: 1.5 }
                                        }}
                                    />

                                    {participant.selection && (
                                        <Paper
                                            sx={{
                                                px: 1,
                                                py: 0.5,
                                                bgcolor: alpha(userColor, 0.9),
                                                color: 'white',
                                                fontSize: '0.7rem',
                                                fontWeight: 500,
                                                maxWidth: 200,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>
                                            {participant.selection.elementType === 'textarea' ? 'Editing: ' : 'Selecting: '}
                                            {participant.selection.text.slice(0, 30)}
                                            {participant.selection.text.length > 30 ? '...' : ''}
                                        </Paper>
                                    )}
                                </Stack>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </Box>

            {/* Participants counter */}
            <Box
                sx={{
                    position: 'fixed',
                    top: 16,
                    right: 16,
                    zIndex: 1010,
                    pointerEvents: 'none'
                }}>
                <Chip
                    label={`${participants.length} user${participants.length !== 1 ? 's' : ''} online`}
                    sx={{
                        bgcolor: alpha(theme.palette.background.paper, 0.95),
                        border: `1px solid ${theme.palette.divider}`,
                        fontWeight: 600,
                        boxShadow: theme.shadows[2]
                    }}
                />
            </Box>
        </Stack>
    );
}