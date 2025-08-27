import Role from "./entity/Role";

export type TPermission = {
    label: string;
    value: string;
};

export const PERMISSION_LIST: TPermission[] = [
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
    { label: "Bisa Tambah Pengguna", value: "can-add-user" },
    { label: "Bisa Edit Pengguna", value: "can-edit-user" },
    { label: "Bisa Hapus Pengguna", value: "can-delete-user" },

    // System/admin
    { label: "Bisa Akses Laporan Aktivitas", value: "can-access-activity-report" },
    { label: "Bisa Mengatur Role & Permission", value: "can-manage-roles" },
    { label: "Bisa Mengubah Pengaturan Sistem", value: "can-change-system-settings" }
];

export const SYSTEM_ROLES: Role[] = [
    {
        label: "Admin",
        name: 'admin',
        abilities: PERMISSION_LIST.map(p => p.value),
        createdAt: 0
    }
]