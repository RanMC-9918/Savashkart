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

export function createScene() {
  const gameWindow = document.getElementById("render-target");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x112277);

  const lightLayer = 10;
  const camera = new CameraManager();
  camera.camera.layers.enable(lightLayer); // Enable layer 10 for the camera

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(gameWindow.clientWidth, gameWindow.clientHeight);
  renderer.shadowMap.enabled = true; // Enable shadow mapping
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Use soft shadows
  gameWindow.appendChild(renderer.domElement);

  const dirLight = new THREE.DirectionalLight(0xffeebb, 10);
  dirLight.castShadow = true; // Enable shadow casting for the light
  dirLight.shadow.mapSize.width = 1024 * 2; // Set shadow map size
  dirLight.shadow.mapSize.height = 1024 * 2; // Set shadow map size
  dirLight.shadow.camera.near = 0.5; // Near plane for shadow camera
  dirLight.shadow.camera.far = 100; // Far plane for shadow camera
  dirLight.shadow.camera.left = -80; // Left plane for shadow camera
  dirLight.shadow.camera.right = 80; // Right plane for shadow camera
  dirLight.shadow.camera.top = 50; // Top plane for shadow camera
  dirLight.shadow.camera.bottom = -50; // Bottom plane for shadow camera
  dirLight.layers.set(lightLayer);
  dirLight.layers.disable(0);
  scene.add(dirLight);

  let carAnims = {};

  let carAnimMixer = null;

  const ambientLight = new THREE.AmbientLight(0x3030f0, 3); // Soft white light
  scene.add(ambientLight);

  //load gltf model
  const gltfLoader = new GLTFLoader();

  const playerController = new PlayerController();

  let marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffff00 })
  );

  scene.add(marker);

  let omarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffff00,
    })
  );

  scene.add(omarker);

  let carModel = null;

  const loader = new THREE.TextureLoader();

  let collideTexture = null;

  let hitboxes = [];

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
            child.receiveShadow = false; // Only cast shadow, don't receive
            child.castShadow = false; // Enable shadow casting
            child.layers.set(0); // Enable layer 0 for the track model
            if (child.name === "BézierCurve.001") {
              child.receiveShadow = true; // Only cast shadow, don't receive
              child.layers.set(lightLayer); // Enable layer 0 for the track model
            }
          }

          if (child.name instanceof String && child.name.contains("hitbox")) {
            hitboxes.push(child);
          }
        });

        scene.add(track);

        displayLoading(60, "Loading Car");
        gltfLoader.load("/game/models/car/car.glb", (gltf) => {
          displayLoading(100, "Done");
          playerController.player = gltf.scene;

          playerController.player.scale.set(5, 5, 5); // Scale the model down
          playerController.player.layers.set(lightLayer); // Enable layer 0 for the player model

          carAnimMixer = new THREE.AnimationMixer(playerController.player);
          gltf.animations.forEach((clip) => {
            carAnims[clip.name] = carAnimMixer.clipAction(clip);
            carAnims[clip.name].setLoop(THREE.LoopOnce);
          });

          console.log(carAnims);

          setInterval(() => {
            carAnims["LookTrack"].play();
          }, 20000)

          // Enable shadow casting for all meshes in the loaded GLTF model
          playerController.player.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = false; // Only cast shadow, don't receive
            }
          });

          scene.add(playerController.player);

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

      console.log(
        JSON.stringify({
          host_name: name,
          min: 0,
        })
      );

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
            min: 0,
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

      console.log(ws);
    });

    joinBtn.addEventListener("click", async () => {
      document.getElementById("start").style.display = "none";

      name = prompt("Enter your name:");

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
    }, 16);

    let updating = setInterval(() => {
      update();
    }, 100);

    ws.onmessage = async (event) => {
      let data = await JSON.parse(event.data);
      data = await JSON.parse(data);

      console.log(others);

      if (data.people) {
        data.people.forEach((other) => {
          if (other.name == name) return;
          let exists = others.find((o) => o.name == other.name);
          if (exists) {
            exists.position.set(other.pos.x, other.pos.y, other.pos.z);
            exists.rotation.set(other.rot.x, other.rot.y, other.rot.z);
            exists.velocity.set(other.vel.x, other.vel.y, other.vel.z);
            exists.timeSinceTick = 0;
          } else {
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
              timeSinceTick: 0,
            });
            scene.add(others[others.length - 1].player);
          }
        });
      }
    };
  }

  let others = [];

  function tick() {
    playerController.tick(0.016); // Assuming 60 FPS, so deltaTime is ~0.016 seconds

    carAnimMixer.update(0.016);

    
    elapsed += 0.016;

    // Map world x/z to [0, 1] for a 200x200 track centered at (0,0)
    if (
      typeof playerController.position.x === "number" &&
      typeof playerController.position.z === "number" &&
      !isNaN(playerController.position.x) &&
      !isNaN(playerController.position.z)
    ) {
      const u = ((playerController.position.x + 100) / 200 - 0.5) / -4;
      const v = ((playerController.position.z + 100) / 200 + 0.5) / 2;

      //console.log(getGroundHeight(collideTexture, u, v).r);

      
    } else {
      console.warn(playerController.position);
    }
    camera.cameraOrigin.copy(playerController.position);
    camera.updateCameraPosition();

    let translationalSpeed = new THREE.Vector2(
      playerController.velocity.x,
      playerController.velocity.z
    ).length();

    camera.camera.fov = Math.min(180, translationalSpeed / 10 + camera.fov); // Adjust FOV based on speed
    const camCenter = (playerController.rotation.y * 180) / Math.PI + 90;
    camera.cameraAzimuthMax = camCenter + 90; // Update camera azimuth based on player rotation
    camera.cameraAzimuthMin = camCenter - 90; // Update camera azimuth based on player rotation

    
    if (Math.abs(camera.cameraAzimuth - camCenter) < 0.1) {
      playerController.rotationVelocity.y = 0;
    }
    else{
        playerController.rotationVelocity.y = camera.cameraAzimuth - camCenter;
        playerController.rotationVelocity.y *= 0.9;
    }
      
    camera.updateCameraPosition();

    dirLight.position.copy(playerController.position);
    dirLight.position.add(new THREE.Vector3(-5, 3, 0));
    dirLight.lookAt(playerController.player);

    others.forEach((other) => {
      other.player.position.copy(other.position);

      other.position.addScaledVector(other.velocity, 0.016);

      other.velocity.multiplyScalar(0.9);

      other.timeSinceTick += 0.016;

      other.player.rotation.copy(other.rotation);
    });
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

      console.log(
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
    }
  }

  return {
    start,
    stop,
  };
}

function getGroundHeight(groundTexture, u, v) {
  if (
    !groundTexture.image ||
    !groundTexture.image.width ||
    !groundTexture.image.height
  )
    return null;

  //console.log("Getting pixel at", u, v);

  // Create a canvas and draw the image if not already done
  if (!groundTexture._canvas) {
    const canvas = document.createElement("canvas");
    canvas.width = groundTexture.image.width;
    canvas.height = groundTexture.image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(groundTexture.image, 0, 0);
    groundTexture._canvas = canvas;
    groundTexture._ctx = ctx;
  }

  // Clamp u and v to [0, 1]
  u = Math.max(0, Math.min(1, u));
  v = Math.max(0, Math.min(1, v));

  const x = Math.floor(u * groundTexture.image.width);
  const y = Math.floor(v * groundTexture.image.height);

  // Clamp x and y to valid pixel indices
  const safeX = Math.max(0, Math.min(groundTexture.image.width - 1, x));
  const safeY = Math.max(0, Math.min(groundTexture.image.height - 1, y));

  const pixel = groundTexture._ctx.getImageData(safeX, safeY, 1, 1).data;
  // pixel is [r, g, b, a]
  return { r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] };
}

function displayLoading(per, mes) {
  filled.style.width = per + "%";
  loadingText.innerText = mes;
}
