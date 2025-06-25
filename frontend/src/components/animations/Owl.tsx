import React, { useEffect, useState } from "react";

const BlinkingOwl: React.FC = () => {
  const [isBlinking, setIsBlinking] = useState(false);

  const openEyes = "/open_v5.png";
  const closedEyes = "/close_v5.png";

  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout>;
    let reopenTimeout: ReturnType<typeof setTimeout>;

    const scheduleNextBlink = () => {
      const openDuration = Math.random() * 5000 + 3000; // 3–8s
      blinkTimeout = setTimeout(() => {
        setIsBlinking(true);
        const blinkDuration = Math.random() * 2000 + 1500; // 150–350ms
        reopenTimeout = setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, blinkDuration);
      }, openDuration);
    };

    scheduleNextBlink();

    return () => {
      clearTimeout(blinkTimeout);
      clearTimeout(reopenTimeout);
    };
  }, []);

  return (
    <div className="relative w-[600px] h-[600px] flex justify-center items-center">
      {!isBlinking && (
        <img
          src={openEyes}
          alt="Owl with Open Eyes"
          className="w-full h-full object-contain"
        />
      )}
      {isBlinking && (
        <img
          src={closedEyes}
          alt="Owl with Closed Eyes"
          className="w-full h-full object-contain"
        />
      )}
    </div>
  );
};

export default BlinkingOwl;
