import {
    createContext,
    useContext,
    useState,
    ReactNode,
    ReactElement,
    Dispatch,
    SetStateAction,
    useMemo
} from 'react';

interface StickyHeaderState {
    header: ReactElement | null;
    setHeader: Dispatch<SetStateAction<ReactElement | null>>;
}

const StickyHeaderContext = createContext<StickyHeaderState | undefined>(undefined);

export const StickyHeaderManager = ({ children }: { children?: ReactNode }) => {
    const [header, setHeader] = useState<ReactElement | null>(null);
    const contextValue = useMemo(() => ({ header, setHeader }), [header]);

    return (
        <StickyHeaderContext.Provider value={contextValue}>
            <StickyHeaderSlot />
            {children}
        </StickyHeaderContext.Provider>
    );
};

// Separate component so only it re-renders when header changes
const StickyHeaderSlot = () => {
    const ctx = useStickyHeaderManager();
    return ctx?.header ?? null;
};

export const useStickyHeaderManager = () => useContext(StickyHeaderContext);
