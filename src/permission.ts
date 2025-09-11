
import { TransferListItem } from "./components/ui/TransferList";
import Role from "./entities/Role";

export type TPermission = {
    label: string;
    value: string;
};

export const PERMISSION_LIST = [
    // File operations
    { label: "Upload File", value: "can-upload-file" },
    { label: "Sunting File", value: "can-edit-file" },
    { label: "Hapus File", value: "can-delete-file" },

    // Folder operations
    { label: "Buat Folder", value: "can-create-folder" },
    { label: "Sunting Folder", value: "can-edit-folder" },
    { label: "Hapus Folder", value: "can-delete-folder" },

    // Sharing
    { label: "Berbagi File", value: "can-share-file" },
    { label: "Berbagi Folder", value: "can-share-folder" },
    { label: "Mengatur Izin Berbagi", value: "can-manage-sharing" },

    // User management
    { label: "Lihat Daftar Pengguna", value: "can-list-user" },
    { label: "Tambah Pengguna", value: "can-add-user" },
    { label: "Edit Pengguna", value: "can-edit-user" },
    { label: "Hapus Pengguna", value: "can-delete-user" },

    // System/admin
    { label: "Akses Laporan Aktivitas", value: "can-access-activity-report" },

    { label: "Melihat (Role & Permission)", value: "can-see-role", parent: "can-manage-role" },
    { label: "Mengelola (Role & Permission)", value: "can-manage-role" },

    { label: "Melihat Pengaturan Sistem", value: "can-see-system-settings", parent: "can-change-system-settings" },
    { label: "Mengubah Pengaturan Sistem", value: "can-change-system-settings" },

    { label: "Melihat Drive Root", value: "can-see-drive-root", parent: "can-manage-drive-root" },
    { label: "Mengelola Drive Root", value: "can-manage-drive-root" },

    { label: 'Melihat Socket Connection', value: 'can-see-socket-connection', parent: 'can-manage-socket-connection' },
    { label: 'Mengelola Socket Connection', value: 'can-manage-socket-connection' },

    { label: "Melihat Task Queue", value: "can-see-task-queue", parent: "can-manage-task-queue" },
    { label: "Mengelola Task Queue", value: "can-manage-task-queue" }
] as const;

// ✅ This now becomes a tuple of string literals
export const PERMISSION_VALUES = PERMISSION_LIST.map(p => p.value) as unknown as PERMISSION_NAMES[];

// ✅ This is now a union of literal strings, so IntelliSense works
export type PERMISSION_NAMES = typeof PERMISSION_LIST[number]["value"];

export const SYSTEM_ROLES: (Role & { editable?: boolean })[] = [
    {
        label: "Admin",
        id: "admin",
        abilities: PERMISSION_VALUES,
        createdAt: 0
    },
    {
        label: "User",
        id: "user",
        abilities: [],
        createdAt: 0,
        editable: true
    }
];

export function getPermissionLabel(value: PERMISSION_NAMES): string {
    // @ts-ignore
    return PERMISSION_LIST.find(p => p.value === value)?.label || value;
}

export function mapPermissionsToLabels(values: PERMISSION_NAMES[]): string[] {
    return values.map(v => getPermissionLabel(v));
}
