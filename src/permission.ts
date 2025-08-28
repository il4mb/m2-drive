import Role from "./entity/Role";

export type TPermission = {
    label: string;
    value: string;
};

export const PERMISSION_LIST = [
    // File operations
    { label: "Bisa Upload File", value: "can-upload-file" },
    { label: "Bisa Download File", value: "can-download-file" },
    { label: "Bisa Sunting File", value: "can-edit-file" },
    { label: "Bisa Hapus File", value: "can-delete-file" },

    // Folder operations
    { label: "Bisa Buat Folder", value: "can-create-folder" },
    { label: "Bisa Hapus Folder", value: "can-delete-folder" },

    // Sharing
    { label: "Bisa Berbagi File", value: "can-share-file" },
    { label: "Bisa Berbagi Folder", value: "can-share-folder" },
    { label: "Bisa Mengatur Izin Berbagi", value: "can-manage-sharing" },

    // User management
    { label: "Lihat Daftar Pengguna", value: "can-list-user" },
    { label: "Bisa Tambah Pengguna", value: "can-add-user" },
    { label: "Bisa Edit Pengguna", value: "can-edit-user" },
    { label: "Bisa Hapus Pengguna", value: "can-delete-user" },

    // System/admin
    { label: "Bisa Akses Laporan Aktivitas", value: "can-access-activity-report" },
    { label: "Bisa Mengatur Role & Permission", value: "can-manage-roles" },
    { label: "Bisa Mengubah Pengaturan Sistem", value: "can-change-system-settings" }
] as const;

// ✅ This now becomes a tuple of string literals
export const PERMISSION_VALUES = PERMISSION_LIST.map(p => p.value) as unknown as PERMISSION_NAMES[];

// ✅ This is now a union of literal strings, so IntelliSense works
export type PERMISSION_NAMES = typeof PERMISSION_LIST[number]["value"];

export const SYSTEM_ROLES: (Role & { editable?: boolean })[] = [
    {
        label: "Admin",
        name: "admin",
        abilities: PERMISSION_VALUES,
        createdAt: 0
    },
    {
        label: "User",
        name: "user",
        abilities: [],
        createdAt: 0,
        editable: true
    }
];

export function getPermissionLabel(value: PERMISSION_NAMES): string {
    return PERMISSION_LIST.find(p => p.value === value)?.label || value;
}

export function mapPermissionsToLabels(values: PERMISSION_NAMES[]): string[] {
    return values.map(v => getPermissionLabel(v));
}
