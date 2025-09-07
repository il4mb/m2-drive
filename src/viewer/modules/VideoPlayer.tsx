'use client'

import { Folder, Video, Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward, Settings } from "lucide-react"
import { useViewerManager, ViewerModule } from "@/viewer/ModuleViewerManager";
import { File } from "@/entity/File";
import { useEffect, useState, useRef, useCallback } from "react";
import { getMany } from "@/libs/websocket/query";
import { onSnapshot } from "@/libs/websocket/snapshot";
import { motion, AnimatePresence } from "motion/react"
import FileView from "@/components/drive/FileView";
import {
    Stack,
    IconButton,
    Slider,
    Typography,
    Box,
    Paper,
    Menu,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Chip
} from "@mui/material";
import usePresignUrl from "@/hooks/usePresignUrl";

interface VideoPlayerProps {
    file: File<'file'>;
}

export const VideoPlayerComponent: React.FC<VideoPlayerProps> = ({ file }) => {
    const source = `/file/${file.id}`;
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);

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

    // Controls auto-hide
    useEffect(() => {
        if (!showControls) return;

        const timer = setTimeout(() => {
            setShowControls(false);
        }, 3000);

        return () => clearTimeout(timer);
    }, [showControls]);

    const togglePlay = useCallback(() => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
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
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
        }
    }, []);

    const toggleMute = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    }, [isMuted]);

    const handleSeek = useCallback((_: Event, value: number | number[]) => {
        const newTime = Array.isArray(value) ? value[0] : value;
        setCurrentTime(newTime);
        if (videoRef.current) {
            videoRef.current.currentTime = newTime;
        }
    }, []);

    const skip = useCallback((seconds: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime += seconds;
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
            if (!containerRef.current?.contains(document.activeElement)) return;

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
    }, [togglePlay, skip, toggleFullscreen, toggleMute]);

    // Fullscreen change listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    if (!source) {
        return (
            <Stack flex={1} alignItems="center" justifyContent="center">
                <Typography>Loading video...</Typography>
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
            onMouseLeave={() => setShowControls(false)}
            sx={{ cursor: showControls ? 'default' : 'none' }}
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
                    outline: 'none'
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
                            transform: 'translate(-50%, -50%)'
                        }}
                    >
                        <Box
                            sx={{
                                width: 48,
                                height: 48,
                                border: '3px solid rgba(255,255,255,0.3)',
                                borderTop: '3px solid white',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
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
                            padding: 16
                        }}
                    >
                        {/* Progress Bar */}
                        <Slider
                            ref={progressRef}
                            value={currentTime}
                            max={duration}
                            onChange={handleSeek}
                            sx={{
                                color: 'white',
                                height: 4,
                                '& .MuiSlider-thumb': {
                                    width: 12,
                                    height: 12,
                                    transition: '0.2s',
                                    '&:hover': {
                                        width: 16,
                                        height: 16
                                    }
                                },
                                '& .MuiSlider-rail': {
                                    opacity: 0.3
                                }
                            }}
                        />

                        {/* Control Buttons */}
                        <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 1 }}>
                            {/* Play/Pause */}
                            <IconButton onClick={togglePlay} sx={{ color: 'white' }}>
                                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                            </IconButton>

                            {/* Volume Control */}
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <IconButton onClick={toggleMute} sx={{ color: 'white' }}>
                                    {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                </IconButton>
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
                            </Stack>

                            {/* Time Display */}
                            <Typography variant="body2" sx={{ color: 'white', minWidth: 100 }}>
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </Typography>

                            {/* Skip Buttons */}
                            <IconButton onClick={() => skip(-10)} sx={{ color: 'white' }}>
                                <SkipBack size={20} />
                            </IconButton>
                            <IconButton onClick={() => skip(10)} sx={{ color: 'white' }}>
                                <SkipForward size={20} />
                            </IconButton>

                            {/* Settings */}
                            <IconButton
                                onClick={(e) => setSettingsAnchor(e.currentTarget)}
                                sx={{ color: 'white' }}
                            >
                                <Settings size={20} />
                            </IconButton>

                            <Menu
                                anchorEl={settingsAnchor}
                                open={Boolean(settingsAnchor)}
                                onClose={() => setSettingsAnchor(null)}
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
                            <IconButton onClick={toggleFullscreen} sx={{ color: 'white' }}>
                                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                            </IconButton>
                        </Stack>

                        {/* Video Title */}
                        <Typography
                            variant="h6"
                            sx={{
                                color: 'white',
                                mt: 1,
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {file.name}
                        </Typography>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Play Button Overlay */}
            <AnimatePresence>
                {!isPlaying && !showControls && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)'
                        }}
                    >
                        <IconButton
                            onClick={togglePlay}
                            sx={{
                                width: 70,
                                height: 70,
                                borderRadius: 100,
                                color: 'white',
                                bgcolor: 'rgba(0,0,0,0.4)',
                                '&:hover': {
                                    bgcolor: 'rgba(0,0,0,0.8)'
                                }
                            }}
                        >
                            <Play size={30} />
                        </IconButton>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
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