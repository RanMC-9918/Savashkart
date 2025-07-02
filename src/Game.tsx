import { useEffect } from "react";
import "./Game.css";

function Game() {
  useEffect(() => {
    const gameScript = document.createElement("script");
    gameScript.type = "module";
    gameScript.src = "/game/Game.js";
    document.body.appendChild(gameScript);

    const setupScript = document.createElement("script");
    setupScript.type = "module";
    setupScript.src = "/game/setup.js";
    document.body.appendChild(setupScript);

    const cameraScript = document.createElement("script");
    cameraScript.type = "module";
    cameraScript.src = "/game/camera.js";
    document.body.appendChild(cameraScript);
  }, []);

  return (
    <>
      <div id="root-window">
        <div id="tags"></div>
        <div id="loadingBar">
          <div id="loadingText">Loading THREE.js</div>
          <div id="filled"></div>
        </div>

        <div id="loading">Refresh if this is taking too long</div>
        <div id="leaderboard">
          <div className="head">
            <p>Name</p>
            <p>Height</p>
          </div>
          <div id="leaders">
          </div>
        </div>
        <div id="start">
          <button id="host">Host</button>
          <button id="join">Join</button>
        </div>
        <div id="render-target"></div>
      </div>
    </>
  );
}

export default Game;
