import { getColor } from '@/theme/colors';
import {
    Box,
    IconButton,
    InputAdornment,
    TextField,
    Typography,
    LinearProgress,
    useTheme
} from '@mui/material';
import { Eye, EyeOff } from 'lucide-react';
import { RefObject, useMemo, useState } from 'react';

export interface PasswordFieldProps {
    label?: string;
    value?: string;
    onChange?: (value: string) => void;
    showable?: boolean;
    progressable?: boolean;
    strengthRef?: RefObject<number>;
    inputRef?: RefObject<HTMLInputElement | null>;
    disabled?: boolean;
    autoFocus?: boolean;
}

export default function PasswordField({
    label,
    value,
    strengthRef,
    inputRef,
    onChange,
    autoFocus = false,
    showable = false,
    progressable = false,
    disabled = false
}: PasswordFieldProps) {
    const [visible, setVisible] = useState(false);
    const theme = useTheme();

    const strength = useMemo(() => {
    let score = 0;
    const password = value || '';

    // Length check
    if (password.length >= 8) score += 1; // basic minimum
    if (password.length >= 12) score += 1; // extra point for longer length

    // Variety check
    if (/[A-Z]/.test(password)) score += 1; // uppercase
    if (/[0-9]/.test(password)) score += 1; // numbers
    if (/[^A-Za-z0-9]/.test(password)) score += 1; // special characters

    // Avoid going above 5
    score = Math.min(score, 5);

    if (strengthRef) {
        strengthRef.current = score;
    }
    return score;
}, [value]);


    const getStrengthLabel = () => {
        switch (strength) {
            case 0:
            case 1:
                return { label: "Lemah", color: getColor('error')[500] };
            case 2:
                return { label: "Sedang", color: getColor('warning')[500] };
            case 3:
                return { label: "Kuat", color: getColor('success')[500] };
            case 4:
                return { label: "Sangat Kuat", color: getColor('success')[500] };
            default:
                return { label: '' }

        }
    };

    const { label: strengthLabel, color } = getStrengthLabel();

    return (
        <Box sx={{ width: '100%' }}>
            <TextField
                inputRef={inputRef}
                label={label}
                type={visible ? 'text' : 'password'}
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                fullWidth
                autoComplete="new-password"
                slotProps={{
                    input: {
                        endAdornment: showable && (
                            <InputAdornment position="end">
                                <IconButton onClick={() => setVisible(!visible)} sx={{ border: 'none' }} edge="end">
                                    {visible ? <EyeOff size={16}/> : <Eye size={16}/>}
                                </IconButton>
                            </InputAdornment>
                        )
                    }
                }}
                autoFocus={autoFocus}
                disabled={disabled}
            />

            {/* Progress Bar */}
            {(progressable && (value || '').length > 0) && (
                <Box mt={1}>
                    <LinearProgress
                        variant="determinate"
                        value={(strength / 4) * 100}
                        sx={{
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: theme.palette.grey[300],
                            '& .MuiLinearProgress-bar': {
                                backgroundColor: color
                            }
                        }}
                    />
                    <Typography
                        component={'small'}
                        sx={{ color, fontWeight: 500, mt: 0.5, display: 'block', fontSize: 11 }}>
                        Kekuatan: {strengthLabel}
                    </Typography>
                </Box>
            )}
        </Box>
    );
}
