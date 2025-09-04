import { File } from '@/entity/File';
import { useRouter } from 'next/navigation';
import { enqueueSnackbar } from 'notistack';
import { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import CloseSnackbar from '../ui/CloseSnackbar';
import TextEditor from '../viewer/TextEditor';

export type ViewerModuleComponentProps = {
    file: File;
    source?: string;
}

export interface ViewerModule {
    id: string;
    name: string;
    icon: ReactNode | string;
    supports: string[] | ((mimeType: string, file: File) => boolean);
    component: React.FC<ViewerModuleComponentProps>;
    priority?: number;
}

interface ViewerManagerState {
    modules: ViewerModule[];
    registerModule: (module: ViewerModule) => void;
    unregisterModule: (moduleId: string) => void;
    getViewerForFile: (file: File, source?: string) => ViewerModule | null;
    getViewerById: (id: string) => ViewerModule | null;
    getSupportedViewers: (file: File) => ViewerModule[];
    openWithSupportedViewer: (file: File) => void;
}

interface ViewerManagerProps {
    children: ReactNode;
    defaultModules?: ViewerModule[];
    endpoint: string;
}

// Create default modules
const defaultViewerModules: ViewerModule[] = [
    {
        id: 'image-viewer',
        name: 'Image Viewer',
        icon: '🖼️',
        supports: ['image/*'],
        component: ({ file, source }) => (
            <img
                src={source}
                alt={file.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
        ),
        priority: 10
    },
    {
        id: 'pdf-viewer',
        name: 'PDF Viewer',
        icon: '📄',
        supports: ['application/pdf'],
        component: ({ file, source }) => (
            <iframe
                src={source}
                width="100%"
                height="100%"
                style={{ border: 'none' }}
                title={file.name}
            />
        ),
        priority: 10
    },
    {
        id: 'video-viewer',
        name: 'Video Player',
        icon: '🎬',
        supports: ['video/*'],
        component: ({ file, source }) => (
            <video
                controls
                style={{ width: '100%', maxHeight: '100%' }}>
                <source src={source} type={(file.meta as any)?.mimeType} />
            </video>
        ),
        priority: 10
    },
    {
        id: 'audio-viewer',
        name: 'Audio Player',
        icon: '🎵',
        supports: ['audio/*'],
        component: ({ file, source }) => (
            <audio controls style={{ width: '100%' }}>
                <source src={source} type={(file.meta as any)?.mimeType} />
            </audio>
        ),
        priority: 10
    },
    {
        id: 'text-viewer',
        name: 'Text Viewer',
        icon: '📝',
        supports: (mimeType) =>
            mimeType?.startsWith('text/') ||
            mimeType?.includes('json') ||
            mimeType?.includes('xml') ||
            mimeType?.includes('code'),
        component: ({ file, source }) => {
            const [content, setContent] = useState('');
            const [loading, setLoading] = useState(true);

            // Fetch text content (simplified)
            return (
                <pre style={{ padding: 16, overflow: 'auto' }}>
                    {loading ? 'Loading...' : content}
                </pre>
            );
        },
        priority: 10
    },
    TextEditor
]

const ViewerManagerContext = createContext<ViewerManagerState | undefined>(undefined);

export const ViewerManager = ({ children, defaultModules = defaultViewerModules, endpoint }: ViewerManagerProps) => {

    const [modules, setModules] = useState<ViewerModule[]>(defaultModules);
    const router = useRouter();

    const registerModule = (module: ViewerModule) => {
        setModules(prev => {
            // Check if module already exists
            const existingIndex = prev.findIndex(m => m.id === module.id);
            if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = module;
                return updated;
            }
            return [...prev, module];
        });
    };

    const unregisterModule = (moduleId: string) => {
        setModules(prev => prev.filter(module => module.id !== moduleId));
    };

    const supportsMimeType = (module: ViewerModule, mimeType: string, file: File): boolean => {
        if (typeof module.supports === 'function') {
            return module.supports(mimeType, file);
        }

        return module.supports.some(pattern => {
            if (pattern.endsWith('/*')) {
                const baseType = pattern.slice(0, -2);
                return mimeType?.startsWith(baseType);
            }
            return mimeType === pattern;
        });
    };

    const getSupportedViewers = (file: File): ViewerModule[] => {
        const mimeType = (file.meta as any)?.mimeType || '';
        return modules
            .filter(module => supportsMimeType(module, mimeType, file))
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    };

    const getViewerForFile = (file: File, source?: string): ViewerModule | null => {
        const supportedViewers = getSupportedViewers(file);
        return supportedViewers[0] || null;
    };

    const getViewerById = (id: string): ViewerModule | null => {
        return modules.find(e => e.id == id) || null
    }

    const openWithSupportedViewer = (file: File) => {

        const viewer = file ? getViewerForFile(file) : null;
        if (!file || !viewer) {
            return enqueueSnackbar(
                "Tidak ada aplikasi yang mendukung jenis file!",
                {
                    variant: 'warning',
                    action: CloseSnackbar
                });
        }

        router.push(`${endpoint.replace("{ID}", file.id)}?with=${viewer.id}`)

    }


    const value: ViewerManagerState = {
        modules,
        registerModule,
        unregisterModule,
        getViewerForFile,
        getSupportedViewers,
        getViewerById,
        openWithSupportedViewer
    };

    return (
        <ViewerManagerContext.Provider value={value}>
            {children}
        </ViewerManagerContext.Provider>
    );
};

export const useViewerManager = () => {
    const context = useContext(ViewerManagerContext);
    if (!context) {
        throw new Error('useViewerManager must be used within a ViewerManager');
    }
    return context;
};

// Hook to get the appropriate viewer component for a file
export const useViewerForFile = (file?: File | null, source?: string) => {
    const { getViewerForFile } = useViewerManager();

    return file ? getViewerForFile(file, source) : null;
};

// Hook to get all supported viewers for a file
export const useSupportedViewers = (file: File) => {
    const { getSupportedViewers } = useViewerManager();
    return getSupportedViewers(file);
};

// Hook to register/unregister viewers
export const useViewerRegistration = () => {
    const { registerModule, unregisterModule } = useViewerManager();
    return { registerModule, unregisterModule };
};


// Utility function to create viewer modules
export const createViewerModule = (definition: Omit<ViewerModule, 'id'> & { id?: string }): ViewerModule => {
    const id = definition.id || `viewer-${Math.random().toString(36).substr(2, 9)}`;
    return {
        ...definition,
        id,
        priority: definition.priority || 5
    };
};






// // Example usage component
// export const FileViewer = ({ file, source }: { file: File; source?: string }) => {
//     const { getViewerForFile } = useViewerManager();
//     const viewerModule = getViewerForFile(file, source);

//     if (!viewerModule) {
//         return <div>No viewer available for this file type</div>;
//     }

//     const ViewerComponent = viewerModule.component;
//     return <ViewerComponent file={file} source={source} />;
// };

// // Example of a custom viewer module
// export const createCustomImageViewer = (): ViewerModule =>
//     createViewerModule({
//         id: 'custom-image-viewer',
//         name: 'Custom Image Viewer',
//         icon: '🎨',
//         supports: ['image/*'],
//         component: ({ file, source }) => (
//             <div style={{ position: 'relative', width: '100%', height: '100%' }}>
//                 <img
//                     src={source}
//                     alt={file.name}
//                     style={{
//                         width: '100%',
//                         height: '100%',
//                         objectFit: 'contain',
//                         filter: 'brightness(1.1) contrast(1.1)'
//                     }}
//                 />
//                 <div style={{
//                     position: 'absolute',
//                     bottom: 10,
//                     right: 10,
//                     background: 'rgba(0,0,0,0.7)',
//                     color: 'white',
//                     padding: '5px 10px',
//                     borderRadius: 5,
//                     fontSize: 12
//                 }}>
//                     Custom Viewer
//                 </div>
//             </div>
//         ),
//         priority: 15 // Higher priority than default image viewer
//     });

