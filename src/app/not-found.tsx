'use client'
import { Box, Typography, Button, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { Home, ArrowRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const Modern404Page = () => {
    const theme = useTheme();

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                delayChildren: 0.3,
                staggerChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 120
            }
        }
    };

    const iconVariants = {
        hidden: { scale: 0, rotate: -180 },
        visible: {
            scale: 1,
            rotate: 0,
            transition: {
                type: "spring",
                stiffness: 160,
                damping: 12
            }
        }
    };

    return (
        <Box
            flex={1}
            component={motion.div}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                padding: 3,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.secondary.main}15 100%)`,
                textAlign: 'center'
            }}
        >
            {/* @ts-ignore */}
            <Box
                component={motion.div}
                variants={iconVariants}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    backgroundColor: 'error.light',
                    color: 'error.contrastText',
                    marginBottom: 4
                }}
            >
                <AlertCircle size={64} />
            </Box>
            {/* @ts-ignore */}

            <Typography
                component={motion.h1}
                variants={itemVariants}
                variant="h1"
                sx={{
                    fontSize: { xs: '6rem', sm: '8rem', md: '10rem' },
                    fontWeight: 'bold',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: 1
                }}
            >
                404
            </Typography>
            {/* @ts-ignore */}

            <Typography
                component={motion.h2}
                variants={itemVariants}
                variant="h4"
                sx={{
                    fontWeight: 600,
                    marginBottom: 2,
                    color: 'text.primary'
                }}
            >
                Page Not Found
            </Typography>
            {/* @ts-ignore */}

            <Typography
                component={motion.p}
                variants={itemVariants}
                variant="body1"
                sx={{
                    maxWidth: 500,
                    marginBottom: 4,
                    color: 'text.secondary'
                }}
            >
                The page you're looking for doesn't exist or has been moved. Let's get you back on track.
            </Typography>
            {/* @ts-ignore */}

            <Box
                component={motion.div}
                variants={itemVariants}
                sx={{
                    display: 'flex',
                    gap: 2,
                    flexDirection: { xs: 'column', sm: 'row' }
                }}
            >
                <Button
                    component={motion.button}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    variant="contained"
                    size="large"
                    startIcon={<Home />}
                    sx={{
                        borderRadius: 3,
                        padding: '10px 24px'
                    }}
                >
                    <Link href="/" passHref style={{ textDecoration: 'none', color: 'inherit' }}>
                        Go Home
                    </Link>
                </Button>

                <Button
                    component={motion.button}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    variant="outlined"
                    size="large"
                    endIcon={<ArrowRight />}
                    sx={{
                        borderRadius: 3,
                        padding: '10px 24px'
                    }}
                >
                    <Link href="/contact" passHref style={{ textDecoration: 'none', color: 'inherit' }}>
                        Report Problem
                    </Link>
                </Button>
            </Box>
            {/* @ts-ignore */}
            <Box
                component={motion.div}
                variants={itemVariants}
                sx={{
                    position: 'absolute',
                    bottom: 20,
                    opacity: 0.7
                }}
            >
                <Typography variant="caption" color="text.secondary">
                    Error code: 404 | Page not found
                </Typography>
            </Box>
        </Box>
    );
};

export default Modern404Page;