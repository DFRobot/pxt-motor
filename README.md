# MecaDrive

Micro:bit mecanum wheel and motor control library.
---------------------------------------------------------

## Table of Contents

* [Summary](#summary)
* [Features](#features)
* [Blocks](#blocks)
* [License](#license)

## Summary
MecaDrive is a motor control library for micro:bit, designed for DFRobot motor driver expansion boards (DFR0548). It provides intuitive blocks for controlling mecanum wheel robots, individual DC motors, and servos.

Perfect for educational robotics projects with kids!

## Features

- **Mecanum Wheel Control**: 10 directional movements (forward, backward, strafe left/right, rotate CW/CCW, 4 diagonal directions)
- **DC Motor Control**: Individual control of 4 DC motors (M1-M4) with configurable directions
- **Servo Control**: Control up to 8 servo motors (S1-S8)
- **Configurable**: Runtime configuration for motor directions and brake strength
- **Kid-Friendly**: Natural language blocks in English, German, and Chinese
- **Hardware Optimized**: Handles HR8833 chip quirks automatically

## Blocks

### 1. Mecanum Movement
Control omnidirectional movement with mecanum wheels:
- Move Forward/Backward
- Strafe Left/Right
- Rotate CW/CCW
- Diagonal movements (4 directions)
- Variable speed (0-255)

### 2. DC Motor Control
Control individual motors M1-M4:
- Clockwise/Counter-clockwise direction
- Variable speed (0-255)
- Motor stop (individual or all)

### 3. Servo Control
Control servos S1-S8:
- Position control (0-180 degrees)

### 4. Configuration (Advanced)
- Motor direction configuration (for different chassis layouts)
- Brake strength adjustment for M3/M4 motors

## Hardware Support

Compatible with DFRobot DFR0548 motor driver expansion board:
- 4x DC motor outputs (M1-M4)
- 8x Servo outputs (S1-S8)
- 9x IO interface pins (P0, P1, P2, P8, P12, P13, P14, P15, P16) with Gravity connectors
- PCA9685 PWM controller via I2C

**Note:** The IO pins are standard micro:bit GPIO pins made accessible through Gravity connectors. Use standard micro:bit pin blocks for sensors, switches, and other digital/analog inputs.

## License

GNU

## Supported targets

* for PXT/microbit
