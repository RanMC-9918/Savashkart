console.log("Game JS Loaded");

import * as THREE from "three";

let apiUrl = "https://api.codewasabi.xyz";

import { CameraManager } from "./camera.js";

import { PlayerController } from "./Player.js";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { keys } from "./input.js";

const hostBtn = document.getElementById("host");
const joinBtn = document.getElementById("join");

const filled = document.getElementById("filled");
const loadingText = document.getElementById("loadingText");
const loadingBar = document.getElementById("loadingBar");

const tags = document.getElementById("tags");

const leaders = document.getElementById("leaders");

export function createScene() {
  const gameWindow = document.getElementById("render-target");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x112277);

  const camera = new CameraManager();

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(gameWindow.clientWidth, gameWindow.clientHeight);
  gameWindow.appendChild(renderer.domElement);

  const dirLight = new THREE.DirectionalLight(0xffeebb, 8);
  dirLight.position.copy(new THREE.Vector3(-20, 3, 0));
  scene.add(dirLight);

  // const lighthelper = new THREE.DirectionalLightHelper(dirLight, 3);
  // scene.add(lighthelper);

  let carAnims = {};

  let carAnimMixer = null;

  let playerHitbox = null;

  const ambientLight = new THREE.AmbientLight(0x3030f0, 3); // Soft white light
  scene.add(ambientLight);

  //load gltf model
  const gltfLoader = new GLTFLoader();

  const playerController = new PlayerController();

  let carModel = null;

  const loader = new THREE.TextureLoader();

  let hitboxes = [];

  const leadersList = [];

  let boxHelperPlayer = null;

  displayLoading(10, "Loading Background");
  loader.load("/game/360.png", (img) => {
    img.mapping = THREE.EquirectangularReflectionMapping;
    img.flipX = true;
    scene.background = img;

    displayLoading(40, "Loading Track");
    gltfLoader.load("/game/models/trackbig/trackbig.glb", (gltf) => {
      let track = gltf.scene;
      track.scale.set(1, 1, 1); // Scale the model down

      // Enable shadow casting for all meshes in the loaded GLTF model
      track.traverse((child) => {
        if (child.isMesh) {
          child.receiveShadow = true;
          child.castShadow = false; // Enable shadow casting
        }

        if(child.name && child.name === "spawn"){
          playerController.position.copy(child.position)
        }

        if (child.name && child.name.indexOf("hitbox") != -1) {
          console.log(
            -Number(child.name.substring(7, child.name.indexOf("p")))
          );
          let mesh = new THREE.Box3().setFromObject(child);

          let boxHelper = new THREE.BoxHelper(child, 0xff0000); // Red outline
          boxHelper.visible = false; //HITBOX HELPERS
          scene.add(boxHelper);


          hitboxes.push({
            box: mesh,
            bounce: -Number(child.name.substring(7, child.name.indexOf("p"))), //-inf - 0
          });
        }
      });

      console.log(hitboxes.length + " hitboxes detected");

      scene.add(track);

      displayLoading(60, "Loading Car");
      gltfLoader.load("/game/models/car/car.glb", (gltf) => {
        displayLoading(100, "Done");
        playerController.player = gltf.scene;

        playerController.player.scale.set(1.1, 1.1, 1.1);

        carAnimMixer = new THREE.AnimationMixer(playerController.player);
        gltf.animations.forEach((clip) => {
          carAnims[clip.name] = carAnimMixer.clipAction(clip);
          carAnims[clip.name].setLoop(THREE.LoopOnce);
        });

        console.log(carAnims);

        playerController.player.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = false;
          }
        });

        playerHitbox = new THREE.Box3().setFromObject(playerController.player);

        scene.add(playerController.player);

        boxHelperPlayer = new THREE.BoxHelper(
          playerController.player,
          0x00ff00
        );
        boxHelperPlayer.visible = false; //HITBOX HELPERS
        scene.add(boxHelperPlayer);

        carModel = playerController.player.clone();

        waitForStart();
      });
    });
  });

  let messager = document.getElementById("loading");

  let gameCode = null;

  let name = null;

  let ws = null;

  async function waitForStart() {
    tick();
    messager.style.display = "none";
    loadingBar.style.display = "none";
    hostBtn.addEventListener("click", async () => {
      document.getElementById("start").style.display = "none";

      name = prompt("Enter your name:");

      leadersList.push({
        name,
        height: 0,
      });

      let gameData = {
        code: "Something is wrong",
      };
      try {
        gameData = await fetch(apiUrl + "/games/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            days: 1,
          }),
        });

        gameData = await gameData.json();
      } catch {
        alert("The API is broken or down.");
      }

      console.log("Game Code:", gameData);

      gameCode = Number(gameData.code);

      messager.style.display = "block";
      messager.innerText = "Game Code: " + gameCode;

      ws = new WebSocket(
        apiUrl.replace("http", "ws") + "/games/" + gameCode + "/" + name
      );

      ws.onopen = () => {
        activateTicking();
      };

      ws.onclose = (event) => {
        console.log(event.data);
      };

      console.log(ws);
    });

    joinBtn.addEventListener("click", async () => {
      document.getElementById("start").style.display = "none";

      name = prompt("Enter your name:");

      leadersList.push({
        name,
        height: 0,
      });

      gameCode = prompt("Enter game code:");

      ws = new WebSocket(
        apiUrl.replace("http", "ws") + "/games/" + gameCode + "/" + name
      );

      console.log(ws);

      ws.onopen = () => {
        activateTicking();
      };
    });
  }

  let elapsed = 0;

  function activateTicking() {
    let ticking = setInterval(() => {
      tick();
    }, 50);

    let nonphysicsTicking = setInterval(() => {
      nonphysicsTick();
    }, 16);

    let updating = setInterval(() => {
      update();
    }, 100);

    ws.onclose = (event) => {
      console.error("The ws closed because: ", event.data);
    };

    ws.onmessage = async (event) => {
      let data = await JSON.parse(event.data);
      data = await JSON.parse(data);


      if (data.people) {
        leadersList.find((e) => e.name === name).height = Math.floor(
          playerController.position.y
        );

        data.people.forEach((other) => {
          if (other.name == name) return;
          let exists = others.find((o) => o.name == other.name);
          if (exists) {
            exists.position.set(other.pos.x, other.pos.y, other.pos.z);
            exists.rotation.set(other.rot.x, other.rot.y, other.rot.z);
            exists.velocity.set(other.vel.x, other.vel.y, other.vel.z);
            exists.timeSinceTick = 0;

            leadersList.find((e) => e.name === other.name).height =
              exists.position.y;
          } else {
            let nameTag = document.createElement("div");
            nameTag.className = "nametag";
            nameTag.innerText = other.name;
            tags.appendChild(nameTag);

            leadersList.push({
              name: other.name,
              height: 0,
            });

            others.push({
              position: new THREE.Vector3(
                other.pos.x,
                other.pos.y,
                other.pos.z
              ),
              rotation: new THREE.Euler(other.rot.x, other.rot.y, other.rot.z),
              velocity: new THREE.Vector3(
                other.vel.x,
                other.vel.y,
                other.vel.z
              ),
              player: carModel.clone(),
              name: other.name,
              nameTag,
              timeSinceTick: 0,
            });
            scene.add(others[others.length - 1].player);
          }
        });
        updateLeaders();
      }
    };
  }

  let others = [];

  function updateLeaders() {
    leadersList.sort((leader, leader2) => leader2.height - leader.height);
    leadersList.forEach((leader, index) => {
      let exists = Array.from(leaders.childNodes).find((row) => {
        return (
          row.querySelector("p") &&
          row.querySelector("p").innerText === leader.name
        );
      });

      if (exists) {
        exists.querySelectorAll("p")[1].innerText =
          Math.floor(leader.height) + "m";
        exists.style.top = index * 45 + "px";
      } else {
        let row = document.createElement("div");
        row.className = "row";
        let p1 = document.createElement("p");
        p1.innerText = leader.name;
        let p2 = document.createElement("p");
        p2.innerText = leader.height;
        row.appendChild(p1);
        row.appendChild(p2);

        if (leader.name === name) {
          row.classList.add("self");
        }

        leaders.appendChild(row);
      }
    });
  }

  function tick() {
    boxHelperPlayer.update();
    playerHitbox.setFromObject(playerController.player);

    playerController.acceleration.y = -50;
    playerController.touching = false;

    hitboxes.forEach((hitbox) => {
      let mesh = hitbox.box;
      if (mesh.intersectsBox(playerHitbox)) {
        playerController.touching = true;
        if (playerHitbox.min.y <= mesh.min.y) {
          console.log("collision side");
          let origin = new THREE.Vector3().copy(mesh.min);
          origin.addScaledVector(mesh.max, 1);
          origin = origin.multiplyScalar(0.5);
          origin.sub(playerController.position);

          if (Math.abs(origin.x) > Math.abs(origin.z)) {
            playerController.velocity.x *= hitbox.bounce - 3;
            playerController.acceleration.set(-1, -50, 0);
          } else {
            playerController.velocity.z *= hitbox.bounce - 3;
            playerController.acceleration.set(0, -50, -1);
          }
        } else {
          console.log("collision top");
          playerController.position.y = mesh.max.y;
          playerController.velocity.y *= hitbox.bounce;
          playerController.acceleration.y = 0;
        }
      }
    });

    if (playerController.position.y <= 0.7) {
      playerController.acceleration.y = 0;
      playerController.velocity.y = 0;
      playerController.position.y = 0.7;
    }

    if (keys["shift"]) {
      camera.cameraRadius = 10;
    } else {
      camera.cameraRadius = 20;
    }

    playerController.accelTick(0.05);
  }

  function nonphysicsTick() {
    playerController.tick(0.016); // Assuming 60 FPS, so deltaTime is ~0.016 seconds

    carAnimMixer.update(0.016);

    elapsed += 0.016;

    others.forEach((other) => {
      other.player.position.copy(other.position);

      other.position.addScaledVector(other.velocity, 0.016);

      other.velocity.x *= 0.99;
      other.velocity.z *= 0.99;
      other.velocity.y *= 1;

      other.timeSinceTick += 0.016;

      let empty = new THREE.Vector3();
      empty.copy(other.position);
      empty.y += 3.5;

      updateLabelPosition(empty, other.nameTag);

      other.player.rotation.copy(other.rotation);
      other.player.rotation.y -= Math.PI / 2;
    });

    camera.cameraOrigin.copy(playerController.position);
    let localDist = new THREE.Vector3(0, 4, -0.5);
    localDist.applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      playerController.rotation.y
    );
    camera.cameraOrigin.add(localDist);

    camera.updateCameraPosition();

    let translationalSpeed = new THREE.Vector3().copy(
      playerController.velocity
    );

    translationalSpeed.y /= 2;
    translationalSpeed = translationalSpeed.length();

    camera.camera.fov +=
      (Math.min(175, translationalSpeed / 5 + camera.fov) - camera.camera.fov) /
      5; // Adjust FOV based on speed

    playerController.rotation.y =
      (camera.cameraAzimuth / 180) * Math.PI - Math.PI / 2;
  }

  function draw() {
    renderer.render(scene, camera.camera);
  }

  function start() {
    renderer.setAnimationLoop(draw);
  }

  function stop() {
    renderer.setAnimationLoop(null);
  }

  const canvas = renderer.domElement;

  function updateLabelPosition(vector, labelElement) {
    vector.project(camera.camera);

    const x = (vector.x * 0.5 + 0.5) * canvas.clientWidth;
    const y = (-vector.y * 0.5 + 0.5) * canvas.clientHeight;

    labelElement.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
  }

  function update() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          pos: {
            x: playerController.position.x,
            y: playerController.position.y,
            z: playerController.position.z,
          },
          rot: {
            x: playerController.rotation.x,
            y: playerController.rotation.y,
            z: playerController.rotation.z,
          },
          vel: {
            x: playerController.velocity.x,
            y: playerController.velocity.y,
            z: playerController.velocity.z,
          },
        })
      );
    } else {
      console.warn("Websocket is not ready :(");
    }
  }

  return {
    start,
    stop,
  };
}

function displayLoading(per, mes) {
  filled.style.width = per + "%";
  loadingText.innerText = mes;
}
