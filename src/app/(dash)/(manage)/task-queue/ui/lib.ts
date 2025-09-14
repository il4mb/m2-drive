import { CheckCircle, Clock, RefreshCw, XCircle } from "lucide-react";

// Constants
export const STATUS_COLORS = {
    pending: 'warning',
    processing: 'info',
    completed: 'success',
    failed: 'error'
} as const;

export const STATUS_ICONS = {
    pending: Clock,
    processing: RefreshCw,
    completed: CheckCircle,
    failed: XCircle
} as const;

export const PRIORITY_COLORS = {
    0: 'default',
    1: 'info',
    2: 'warning',
    3: 'error'
} as const;

export const STATUS_FILTERS = [
    { value: 'all', label: 'All', color: 'default' },
    { value: 'pending', label: 'Pending', color: 'warning' },
    { value: 'processing', label: 'Processing', color: 'info' },
    { value: 'completed', label: 'Completed', color: 'success' },
    { value: 'failed', label: 'Failed', color: 'error' }
] as const;

// Chart color palette
export const CHART_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];