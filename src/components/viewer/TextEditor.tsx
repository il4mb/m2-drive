import { PencilLine, Save, Download, AlertCircle } from "lucide-react"
import { ViewerModule } from "../context/ViewerManager";
import { useEffect, useState, useRef, useCallback } from "react";
import { Alert, Stack, IconButton, LinearProgress, Typography, Box, Paper, Button } from "@mui/material";
import { formatFileSize } from "@/libs/utils";

// Maximum file size to handle (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default {
    priority: 5,
    id: 'text-editor',
    name: "Text Editor",
    icon: <PencilLine size={18} />,
    supports: () => true,
    component({ file, source }) {
        const [text, setText] = useState<string>('');
        const [originalText, setOriginalText] = useState<string>('');
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState<string | null>(null);
        const [saving, setSaving] = useState(false);
        const [isDirty, setIsDirty] = useState(false);
        const [showLargeFileWarning, setShowLargeFileWarning] = useState(false);
        const textareaRef = useRef<HTMLTextAreaElement>(null);

        const fileSize = (file.meta as any)?.size || 0;

        useEffect(() => {
            if (!source) return;

            // Warn for large files but still load them
            if (fileSize > 2 * 1024 * 1024) { // 2MB warning threshold
                setShowLargeFileWarning(true);
            }

            const fetchText = async () => {
                setLoading(true);
                setError(null);

                try {
                    const response = await fetch(source);
                    if (!response.ok) {
                        throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
                    }
                    
                    const reader = response.body?.getReader();
                    const decoder = new TextDecoder("utf-8");
                    let content = "";

                    if (reader) {
                        let done = false;
                        while (!done) {
                            const { value, done: streamDone } = await reader.read();
                            done = streamDone;
                            if (value) {
                                content += decoder.decode(value, { stream: !done });
                                
                                // Update text progressively for very large files
                                if (content.length > 1000000) { // Update every 1MB
                                    setText(content);
                                }
                            }
                        }
                    }

                    setText(content);
                    setOriginalText(content);
                } catch (err: any) {
                    setError(err?.message || "Failed to load file");
                } finally {
                    setLoading(false);
                }
            };
            fetchText();
        }, [source, fileSize]);

        const handleTextChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
            const newText = event.target.value;
            setText(newText);
            setIsDirty(newText !== originalText);
        }, [originalText]);

        const handleSave = async () => {
            if (!source || !isDirty) return;

            setSaving(true);
            try {
                // Simulate save operation
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                setOriginalText(text);
                setIsDirty(false);
                
                console.log("File saved");
            } catch (err: any) {
                setError(err?.message || "Failed to save file");
            } finally {
                setSaving(false);
            }
        };

        const handleDownload = () => {
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };

        const handleAcceptLargeFile = () => {
            setShowLargeFileWarning(false);
        };

        if (loading) {
            return (
                <Stack spacing={2} p={2}>
                    <LinearProgress />
                    <Typography variant="body2" color="text.secondary">
                        Loading {file.name}... ({formatFileSize(fileSize)})
                    </Typography>
                </Stack>
            );
        }

        if (showLargeFileWarning) {
            return (
                <Stack spacing={2} p={4} alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                    <AlertCircle size={48} color="orange" />
                    <Typography variant="h6" textAlign="center">
                        Large File Warning
                    </Typography>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                        This file is {formatFileSize(fileSize)} and may cause performance issues
                        when editing in the text editor.
                    </Typography>
                    <Stack direction="row" spacing={2} mt={2}>
                        <Button variant="outlined" onClick={handleDownload}>
                            Download Instead
                        </Button>
                        <Button variant="contained" onClick={handleAcceptLargeFile}>
                            Continue Anyway
                        </Button>
                    </Stack>
                </Stack>
            );
        }

        return (
            <Stack spacing={2} sx={{ height: '100%', width: '100%', p: 2 }}>
                {/* Header with file info and actions */}
                <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack>
                            <Typography variant="h6" component="h2">
                                {file.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Size: {formatFileSize(fileSize)}
                                {fileSize > 1000000 && " (Large file - editing may be slow)"}
                            </Typography>
                        </Stack>

                        <Stack direction="row" spacing={1}>
                            <IconButton
                                onClick={handleDownload}
                                color="primary"
                                title="Download"
                                size="small">
                                <Download size={18} />
                            </IconButton>

                            <IconButton
                                onClick={handleSave}
                                disabled={!isDirty || saving}
                                color="primary"
                                title="Save changes"
                                size="small">
                                <Save size={18} />
                            </IconButton>
                        </Stack>
                    </Stack>
                </Paper>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {saving && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Saving changes...
                    </Alert>
                )}

                {isDirty && !saving && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        You have unsaved changes
                    </Alert>
                )}

                {/* Optimized textarea for large files */}
                <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={handleTextChange}
                        placeholder="File content will appear here..."
                        style={{
                            width: '100%',
                            height: '100%',
                            padding: '12px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontSize: '14px',
                            lineHeight: '1.5',
                            resize: 'none',
                            boxSizing: 'border-box',
                        }}
                        spellCheck={false}
                    />
                </Box>

                {/* Status bar */}
                <Paper sx={{ p: 1, bgcolor: 'background.default' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                            Lines: {text.split('\n').length} |
                            Characters: {text.length.toLocaleString()} |
                            {isDirty ? ' Modified' : ' Saved'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Text Editor
                        </Typography>
                    </Stack>
                </Paper>
            </Stack>
        );
    }
} as ViewerModule;