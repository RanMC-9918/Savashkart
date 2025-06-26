import * as THREE from "three";

import { keys } from "./input.js";

export class PlayerController {
  constructor() {
    this.position = new THREE.Vector3(0.821, 2, -5.982);
    this.rotation = new THREE.Euler(0, -Math.PI, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.acceleration = new THREE.Vector3(0, 0, 0);
    this.accelerationRot = new THREE.Vector3(0, 0, 0);
    this.rotationSpeed = 0.05; // Rotation speed in radians per second
    this.rotationVelocity = new THREE.Vector3(0, 0, 0);
    this.speed = 200;
    this.maxSpeed = 70.0; //terminal velocity
    this.player = null;
  }
  tick(deltaTime) {
    
    // Apply acceleration
    this.velocity.addScaledVector(this.acceleration, deltaTime);

    this.position.addScaledVector(this.velocity, deltaTime);

    this.rotationVelocity.addScaledVector(this.accelerationRot, deltaTime);
    this.rotationVelocity.multiplyScalar(0.9); // Dampen rotation velocity
    this.rotation.y += this.rotationVelocity.y * deltaTime; // Update rotation based on rotation velocity

    this.velocity.clampLength(0, this.maxSpeed); // Limit speed]

    this.velocity.x *= 0.9;
    this.velocity.z *= 0.9;
    this.velocity.y *= 1;

    if (Math.abs(this.velocity.x) < 0.01) {
      this.velocity.x = 0;
    }
    if (Math.abs(this.velocity.y) < 0.01) {
      this.velocity.y = 0;
    }
    if (Math.abs(this.velocity.z) < 0.01) {
      this.velocity.z = 0;
    }

    // Update player mesh position and rotation
    this.player.position.copy(this.position);

    this.player.rotation.copy(this.rotation);

    this.player.rotation.y -= Math.PI / 2;
  }
  accelTick(deltaTime){

    // Update position based on velocity
    let x = 0;

    let y = 0;

    if (keys["w"]) {
      x = -this.speed; // Move forward
    } else if (keys["s"]) {
      x = this.speed; // Move backward
    }

    if (keys["a"]) {
      y = this.speed; // Move forward
    } else if (keys["d"]) {
      y = -this.speed; // Move backward
    }

    if (keys[" "] && this.velocity.y === 0) {
      this.velocity.y = 40;
      this.position.y += 0.1;
    }

    this.acceleration.x = x 
    this.acceleration.z = y;
    this.acceleration.clampLength(0, this.speed);

    this.acceleration.applyEuler(this.rotation, "XYZ"); // Apply rotation to acceleration
  }
}
