import { getDurationToMidnight } from "@/libs/utils";
import { useEffect, useState } from "react";

export const useCountdownToMidnight = () => {
    
  const [timeLeft, setTimeLeft] = useState(getDurationToMidnight());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getDurationToMidnight());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return timeLeft;
};