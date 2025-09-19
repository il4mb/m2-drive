"use client";

import { motion } from "motion/react";
import { useMemo } from "react";


type CircleConfig = {
    className: string;
    size: number;
    duration: number;
};

const circles: CircleConfig[] = [
    { className: "blue", size: 400, duration: 20 },
    { className: "red", size: 350, duration: 25 },
    { className: "purple", size: 300, duration: 18 },
    { className: "green", size: 280, duration: 22 },
];

// helper random
function random(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

export default function AnimatedBackground() {
    // generate spawn positions sekali aja biar gak berubah tiap render
    const spawnPositions = useMemo(
        () =>
            circles.map(() => ({
                x: random(0, window.innerWidth * 0.8),
                y: random(0, window.innerHeight * 0.8),
            })),
        []
    );

    return (
        <div className="bg-animated">
            {circles.map((c, i) => (
                <motion.div
                    key={i}
                    className={`circle ${c.className}`}
                    initial={{
                        x: spawnPositions[i].x,
                        y: spawnPositions[i].y,
                    }}
                    animate={{
                        x: [spawnPositions[i].x, random(0, window.innerWidth * 0.8)],
                        y: [spawnPositions[i].y, random(0, window.innerHeight * 0.8)],
                    }}
                    transition={{
                        duration: c.duration,
                        repeat: Infinity,
                        repeatType: "reverse", // biar kayak mantul
                        ease: "easeInOut",
                    }}
                    style={{ width: c.size, height: c.size }}
                />
            ))}
        </div>
    );
}
