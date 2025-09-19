'use client'

import { Video, Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward, Settings } from "lucide-react"
import { ViewerModule } from "@/viewer/ModuleViewerManager";
import { File } from "@/entities/File";
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react"
import {
    Stack,
    IconButton,
    Slider,
    Typography,
    Box,
    Menu,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    useTheme,
    useMediaQuery
} from "@mui/material";
import usePresignUrl from "@/hooks/usePresignUrl";

interface VideoPlayerProps {
    file: File<'file'>;
}

export const VideoPlayerComponent: React.FC<VideoPlayerProps> = ({ file }) => {
    const source = usePresignUrl(file.id);
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isBuffering, setIsBuffering] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [quality, setQuality] = useState('auto');
    const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null);
    const [isSeeking, setIsSeeking] = useState(false);

    // Controls auto-hide with touch device support
    useEffect(() => {
        if (!showControls || isSeeking) return;

        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }

        controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
        }, 3000);

        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, [showControls, isSeeking]);

    // Handle touch events for mobile devices
    useEffect(() => {
        const handleTouchStart = () => {
            setShowControls(true);
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('touchstart', handleTouchStart);
            return () => container.removeEventListener('touchstart', handleTouchStart);
        }
    }, []);

    const togglePlay = useCallback(() => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play().catch(console.error);
            }
            setIsPlaying(!isPlaying);
        }
    }, [isPlaying]);

    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(console.error);
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    }, []);

    const handleVolumeChange = useCallback((_: Event, value: number | number[]) => {
        const newVolume = Array.isArray(value) ? value[0] : value;
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
            videoRef.current.muted = newVolume === 0;
        }
    }, []);

    const toggleMute = useCallback(() => {
        if (videoRef.current) {
            const newMutedState = !isMuted;
            videoRef.current.muted = newMutedState;
            setIsMuted(newMutedState);
            if (newMutedState) {
                setVolume(0);
            } else {
                setVolume(videoRef.current.volume || 0.5);
            }
        }
    }, [isMuted]);

    const handleSeekStart = useCallback(() => {
        setIsSeeking(true);
        setShowControls(true);
    }, []);

    const handleSeek = useCallback((_: Event, value: number | number[]) => {
        const newTime = Array.isArray(value) ? value[0] : value;
        setCurrentTime(newTime);
    }, []);

    const handleSeekEnd = useCallback((_: Event | React.SyntheticEvent, value: number | number[]) => {
        const newTime = Array.isArray(value) ? value[0] : value;
        setCurrentTime(newTime);
        if (videoRef.current) {
            videoRef.current.currentTime = newTime;
        }
        setIsSeeking(false);
    }, []);

    const skip = useCallback((seconds: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime += seconds;
            setShowControls(true);
        }
    }, []);

    const formatTime = useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (!containerRef.current?.contains(document.activeElement) && !isFullscreen) return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    skip(-10);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    skip(10);
                    break;
                case 'KeyF':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'KeyM':
                    e.preventDefault();
                    toggleMute();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [togglePlay, skip, toggleFullscreen, toggleMute, isFullscreen]);

    // Fullscreen change listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
            setShowControls(true);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Handle video source changes
    useEffect(() => {
        if (videoRef.current && source) {
            videoRef.current.load();
        }
    }, [source]);

    if (!source) {
        return (
            <Stack flex={1} alignItems="center" justifyContent="center" sx={{ bgcolor: 'black' }}>
                <Typography color="white">Loading video...</Typography>
            </Stack>
        );
    }

    return (
        <Stack
            ref={containerRef}
            flex={1}
            width="100%"
            height="100%"
            position="relative"
            bgcolor="black"
            onMouseMove={() => setShowControls(true)}
            onMouseLeave={() => !isSeeking && setShowControls(false)}
            sx={{
                cursor: showControls ? 'default' : 'none',
                touchAction: 'none',
                overflow: 'hidden'
            }}
        >
            {/* Video Element */}
            <Box
                component="video"
                ref={videoRef}
                src={source}
                width="100%"
                height="100%"
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                onDurationChange={() => setDuration(videoRef.current?.duration || 0)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
                onEnded={() => setIsPlaying(false)}
                onClick={togglePlay}
                sx={{
                    objectFit: 'contain',
                    outline: 'none',
                    width: '100%',
                    height: '100%'
                }}
            />

            {/* Buffering Indicator */}
            <AnimatePresence>
                {isBuffering && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 10
                        }}
                    >
                        <Box
                            sx={{
                                width: 48,
                                height: 48,
                                border: '3px solid rgba(255,255,255,0.3)',
                                borderTop: '3px solid white',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                '@media (max-width: 600px)': {
                                    width: 36,
                                    height: 36
                                }
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Controls Overlay */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                            padding: isMobile ? '8px' : '16px',
                            zIndex: 20
                        }}
                    >
                        {/* Progress Bar */}
                        <Slider
                            ref={progressRef}
                            value={currentTime}
                            max={duration}
                            onChange={handleSeek}
                            onChangeCommitted={handleSeekEnd}
                            onMouseDown={handleSeekStart}
                            onTouchStart={handleSeekStart}
                            sx={{
                                color: 'white',
                                height: 4,
                                mx: isMobile ? 0.5 : 1,
                                '& .MuiSlider-thumb': {
                                    width: isMobile ? 10 : 12,
                                    height: isMobile ? 10 : 12,
                                    transition: '0.2s',
                                    '&:hover, &:active': {
                                        width: isMobile ? 14 : 16,
                                        height: isMobile ? 14 : 16
                                    }
                                },
                                '& .MuiSlider-rail': {
                                    opacity: 0.3
                                }
                            }}
                        />

                        {/* Control Buttons */}
                        <Stack
                            direction="row"
                            alignItems="center"
                            spacing={isMobile ? 0.5 : 1}
                            sx={{ mt: 1 }}
                        >
                            {/* Play/Pause */}
                            <IconButton
                                onClick={togglePlay}
                                sx={{
                                    color: 'white',
                                    padding: isMobile ? '4px' : '8px'
                                }}
                            >
                                {isPlaying ?
                                    <Pause size={isMobile ? 18 : 20} /> :
                                    <Play size={isMobile ? 18 : 20} />
                                }
                            </IconButton>

                            {/* Volume Control - Hidden on mobile when not fullscreen */}
                            {(!isMobile || isFullscreen) && (
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <IconButton
                                        onClick={toggleMute}
                                        sx={{
                                            color: 'white',
                                            padding: isMobile ? '4px' : '8px'
                                        }}
                                    >
                                        {isMuted || volume === 0 ?
                                            <VolumeX size={isMobile ? 16 : 20} /> :
                                            <Volume2 size={isMobile ? 16 : 20} />
                                        }
                                    </IconButton>
                                    {!isMobile && (
                                        <Slider
                                            value={isMuted ? 0 : volume}
                                            max={1}
                                            step={0.1}
                                            onChange={handleVolumeChange}
                                            sx={{
                                                color: 'white',
                                                width: 80,
                                                '& .MuiSlider-rail': {
                                                    opacity: 0.3
                                                }
                                            }}
                                        />
                                    )}
                                </Stack>
                            )}

                            {/* Time Display */}
                            <Typography
                                variant="body2"
                                sx={{
                                    color: 'white',
                                    minWidth: isMobile ? 70 : 100,
                                    fontSize: isMobile ? '0.75rem' : '0.875rem'
                                }}
                            >
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </Typography>

                            {/* Skip Buttons - Hidden on mobile */}
                            {!isMobile && (
                                <>
                                    <IconButton
                                        onClick={() => skip(-10)}
                                        sx={{
                                            color: 'white',
                                            padding: '8px'
                                        }}
                                    >
                                        <SkipBack size={20} />
                                    </IconButton>
                                    <IconButton
                                        onClick={() => skip(10)}
                                        sx={{
                                            color: 'white',
                                            padding: '8px'
                                        }}
                                    >
                                        <SkipForward size={20} />
                                    </IconButton>
                                </>
                            )}

                            {/* Settings - Hidden on mobile */}
                            {!isMobile && (
                                <IconButton
                                    onClick={(e) => setSettingsAnchor(e.currentTarget)}
                                    sx={{
                                        color: 'white',
                                        padding: '8px'
                                    }}
                                >
                                    <Settings size={20} />
                                </IconButton>
                            )}

                            <Menu
                                anchorEl={settingsAnchor}
                                open={Boolean(settingsAnchor)}
                                onClose={() => setSettingsAnchor(null)}
                                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                            >
                                <MenuItem>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Speed</InputLabel>
                                        <Select
                                            value={playbackRate}
                                            label="Speed"
                                            onChange={(e) => {
                                                const rate = Number(e.target.value);
                                                setPlaybackRate(rate);
                                                if (videoRef.current) {
                                                    videoRef.current.playbackRate = rate;
                                                }
                                            }}
                                        >
                                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                                                <MenuItem key={rate} value={rate}>
                                                    {rate}x
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </MenuItem>
                                <MenuItem>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Quality</InputLabel>
                                        <Select
                                            value={quality}
                                            label="Quality"
                                            onChange={(e) => setQuality(e.target.value)}
                                        >
                                            <MenuItem value="auto">Auto</MenuItem>
                                            <MenuItem value="1080p">1080p</MenuItem>
                                            <MenuItem value="720p">720p</MenuItem>
                                            <MenuItem value="480p">480p</MenuItem>
                                        </Select>
                                    </FormControl>
                                </MenuItem>
                            </Menu>

                            <Box sx={{ flex: 1 }} />

                            {/* Fullscreen */}
                            <IconButton
                                onClick={toggleFullscreen}
                                sx={{
                                    color: 'white',
                                    padding: isMobile ? '4px' : '8px'
                                }}>
                                {isFullscreen ?
                                    <Minimize size={isMobile ? 18 : 20} /> :
                                    <Maximize size={isMobile ? 18 : 20} />
                                }
                            </IconButton>
                        </Stack>

                        {/* Video Title - Hidden on mobile */}
                        {!isMobile && (
                            <Typography
                                variant="h6"
                                sx={{
                                    color: 'white',
                                    mt: 1,
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                    fontSize: isTablet ? '1rem' : '1.25rem'
                                }}>
                                {file.name}
                            </Typography>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Play Button Overlay */}
            <AnimatePresence>
                {!isPlaying && !showControls && (
                    <Box sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 15
                    }}>
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}>
                            <IconButton
                                onClick={togglePlay}
                                sx={{
                                    width: isMobile ? 56 : 70,
                                    height: isMobile ? 56 : 70,
                                    borderRadius: 100,
                                    color: 'white',
                                    bgcolor: 'rgba(0,0,0,0.4)',
                                    '&:hover': {
                                        bgcolor: 'rgba(0,0,0,0.8)'
                                    }
                                }}>
                                <Play size={isMobile ? 24 : 30} />
                            </IconButton>
                        </motion.div>
                    </Box>
                )}
            </AnimatePresence>

            {/* Mobile double-tap seek indicators */}
            <AnimatePresence>
                {isMobile && !showControls && (
                    <>
                        <Box
                            sx={{
                                position: 'absolute',
                                left: '25%',
                                top: 0,
                                bottom: 0,
                                width: '25%',
                                zIndex: 5
                            }}
                        />
                        <Box
                            sx={{
                                position: 'absolute',
                                right: '25%',
                                top: 0,
                                bottom: 0,
                                width: '25%',
                                zIndex: 5
                            }}
                        />
                    </>
                )}
            </AnimatePresence>

            <style jsx global>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                /* Improve mobile video controls */
                video::-webkit-media-controls {
                    display: none !important;
                }
                
                /* Prevent iOS safari from overriding styles */
                @supports (-webkit-touch-callout: none) {
                    .video-container {
                        -webkit-touch-callout: none;
                    }
                }
            `}</style>
        </Stack>
    );
};

export default {
    priority: 10,
    id: 'video-player',
    name: "Video Player",
    icon: <Video size={18} />,
    supports: ['video/*'],
    component: VideoPlayerComponent
} as ViewerModule;