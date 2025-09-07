import { useEffect, useRef, useState } from "react";
import { toRelativeTime } from "@/libs/utils";

interface RelativeTimeProps {
    timestamp: number;
}

export default function RelativeTime({ timestamp }: RelativeTimeProps) {
    const [text, setText] = useState(() => toRelativeTime(timestamp));
    const frameRef = useRef<number>(0);

    useEffect(() => {
        const update = () => {
            setText(toRelativeTime(timestamp));
            frameRef.current = requestAnimationFrame(update);
        };

        frameRef.current = requestAnimationFrame(update);

        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [timestamp]);

    return <>{text}</>
}
