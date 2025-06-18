import React, { useEffect, useState } from "react";

const BlinkingOwl: React.FC = () => {
  const [isBlinking, setIsBlinking] = useState(false);

  const openEyes = "/owl_stillv3.png";
  const closedEyes = "/owl_closev2.png";

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
    <div className="w-96 h-96 flex justify-center items-center">
      {!isBlinking && (
        <img
          src={openEyes}
          alt="Owl with Open Eyes"
          className="absolute inset-0 w-full h-full"
        />
      )}
      {isBlinking && (
        <img
          src={closedEyes}
          alt="Owl with Closed Eyes"
          className="absolute inset-0 w-full h-full"
        />
      )}
    </div>
  );
};

export default BlinkingOwl;
