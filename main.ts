/*！
 * @file pxt-mecadrive/main.ts
 * @brief DFRobot's microbit motor drive makecode library.
 * @n [Get the module here](http://www.dfrobot.com.cn/goods-1577.html)
 * @n This is the microbit motor drive library for DC motors, servos, and mecanum wheels.
 *
 * @copyright	[DFRobot](http://www.dfrobot.com), 2016
 * @copyright	GNU Lesser General Public License
 *
 * @author [email](1035868977@qq.com)
 * @version  V1.1.0
 * @date  2025-01-16
 *
 * CHANGELOG V1.1.0:
 * - Added mecanum wheel control blocks for educational smart cart
 * - Support for 10 movement directions: forward, backward, strafe, rotate, diagonals
 * - Variable speed control (0-255) for all mecanum movements
 * - Added configurable settings (all runtime, no recompilation needed):
 *   * Individual motor direction configuration (M1, M2, M3, M4)
 *   * Brake strength for M3/M4 motors (tune for your motors)
 *   * Default: M1/M2 normal, M3/M4 reversed, brake=1000
 * - Fixed M3/M4 motor control to handle U2 HR8833 chip quirks:
 *   * M3 = Channel 2 (pins 2-3), M4 = Channel 1 (pins 0-1)
 *   * Both channels have reversed polarity (CW command → CCW rotation)
 *   * Individual motor control requires brake mode on other channel
 *   * Strafe adapted to U2 chip limitation (can't drive opposite directions)
 * - Optimized PWM scaling to use full 0-4095 range (was only using 0-4080)
 * - Added input validation and clamping for speed parameter
 * - Removed stepper motor blocks (not supported by expansion board)
 * - Improved code documentation and robustness
 */

/**
 * MecaDrive - Motor driver for DC motors, servos, and mecanum wheels
 */
//% weight=10 color=#DF6721 icon="\uf013" block="MecaDrive"
namespace motor {
    const PCA9685_ADDRESS = 0x40
    const MODE1 = 0x00
    const MODE2 = 0x01
    const SUBADR1 = 0x02
    const SUBADR2 = 0x03
    const SUBADR3 = 0x04
    const PRESCALE = 0xFE
    const LED0_ON_L = 0x06
    const LED0_ON_H = 0x07
    const LED0_OFF_L = 0x08
    const LED0_OFF_H = 0x09
    const ALL_LED_ON_L = 0xFA
    const ALL_LED_ON_H = 0xFB
    const ALL_LED_OFF_L = 0xFC
    const ALL_LED_OFF_H = 0xFD

    /**
     * The user can select the 8 servo controller.
     */
    export enum Servos {
        S1 = 0x08,
        S2 = 0x07,
        S3 = 0x06,
        S4 = 0x05,
        S5 = 0x04,
        S6 = 0x03,
        S7 = 0x02,
        S8 = 0x01
    }

    /**
     * The user selects the 4-way dc motor.
     */
    export enum Motors {
        M1 = 0x1,
        M2 = 0x2,
        M3 = 0x3,
        M4 = 0x4
    }

    /**
     * The user defines the motor rotation direction.
     */
    export enum Dir {
        //% blockId="CW" block="clockwise"
        CW = 1,
        //% blockId="CCW" block="counter-clockwise"
        CCW = -1,
    }

    /**
     * Mecanum wheel movement directions
     */
    export enum MecanumDirection {
        //% block="Forward"
        Forward,
        //% block="Backward"
        Backward,
        //% block="Strafe Left"
        StrafeLeft,
        //% block="Strafe Right"
        StrafeRight,
        //% block="Rotate CW"
        RotateCW,
        //% block="Rotate CCW"
        RotateCCW,
        //% block="Diagonal Forward-Right"
        DiagonalForwardRight,
        //% block="Diagonal Forward-Left"
        DiagonalForwardLeft,
        //% block="Diagonal Backward-Right"
        DiagonalBackwardRight,
        //% block="Diagonal Backward-Left"
        DiagonalBackwardLeft
    }


    let initialized = false

    // Motor direction configuration (for different chassis)
    let reverseM1 = false  // M1 normal by default
    let reverseM2 = false  // M2 normal by default
    let reverseM3 = true   // M3 reversed by default (DFRobot chassis)
    let reverseM4 = true   // M4 reversed by default (DFRobot chassis)

    // Performance tuning
    let brakePwmLevel = 1000  // Brake mode PWM for M3/M4 (0-4095)

    function i2cWrite(addr: number, reg: number, value: number) {
        let buf = pins.createBuffer(2)
        buf[0] = reg
        buf[1] = value
        pins.i2cWriteBuffer(addr, buf)
    }

    function i2cCmd(addr: number, value: number) {
        let buf = pins.createBuffer(1)
        buf[0] = value
        pins.i2cWriteBuffer(addr, buf)
    }

    function i2cRead(addr: number, reg: number) {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        let val = pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
        return val;
    }

    function initPCA9685(): void {
        i2cWrite(PCA9685_ADDRESS, MODE1, 0x00)
        setFreq(50);
        initialized = true
    }

    function setFreq(freq: number): void {
        // Constrain the frequency
        let prescaleval = 25000000;
        prescaleval /= 4096;
        prescaleval /= freq;
        prescaleval -= 1;
        let prescale = prescaleval;//Math.floor(prescaleval + 0.5);
        let oldmode = i2cRead(PCA9685_ADDRESS, MODE1);
        let newmode = (oldmode & 0x7F) | 0x10; // sleep
        i2cWrite(PCA9685_ADDRESS, MODE1, newmode); // go to sleep
        i2cWrite(PCA9685_ADDRESS, PRESCALE, prescale); // set the prescaler
        i2cWrite(PCA9685_ADDRESS, MODE1, oldmode);
        control.waitMicros(5000);
        i2cWrite(PCA9685_ADDRESS, MODE1, oldmode | 0xa1);
    }

    function setPwm(channel: number, on: number, off: number): void {
        if (channel < 0 || channel > 15)
            return;

        let buf = pins.createBuffer(5);
        buf[0] = LED0_ON_L + 4 * channel;
        buf[1] = on & 0xff;
        buf[2] = (on >> 8) & 0xff;
        buf[3] = off & 0xff;
        buf[4] = (off >> 8) & 0xff;
        pins.i2cWriteBuffer(PCA9685_ADDRESS, buf);
    }



    /**
     * Configure motor directions for your chassis. Enable reverse for motors mounted backwards
     * @param m1 true to reverse M1
     * @param m2 true to reverse M2
     * @param m3 true to reverse M3
     * @param m4 true to reverse M4
     */
    //% blockId=motor_configMotorDirections block="Motor directions|M1 reversed %m1|M2 reversed %m2|M3 reversed %m3|M4 reversed %m4"
    //% weight=103
    //% m1.shadow="toggleOnOff" m1.defl=false
    //% m2.shadow="toggleOnOff" m2.defl=false
    //% m3.shadow="toggleOnOff" m3.defl=true
    //% m4.shadow="toggleOnOff" m4.defl=true
    //% advanced=true
    //% group="Advanced"
    export function configMotorDirections(m1: boolean, m2: boolean, m3: boolean, m4: boolean): void {
        reverseM1 = m1
        reverseM2 = m2
        reverseM3 = m3
        reverseM4 = m4
    }

    /**
     * Set brake strength for M3/M4 motors (0-4095). Higher values = stronger brake
     * @param level brake strength 0-4095, default 1000
     */
    //% blockId=motor_configBrakePwm block="Set brake strength|%level"
    //% weight=101
    //% level.min=0 level.max=4095 level.defl=1000
    //% advanced=true
    //% group="Advanced"
    export function configBrakeStrength(level: number): void {
        brakePwmLevel = Math.max(0, Math.min(4095, level))
    }

    /**
     * Control a servo motor from 0° to 180°
     * @param index servo S1-S8
     * @param degree angle 0-180
	*/
    //% blockId=motor_servo block="Servo|%index|degree|%degree"
    //% weight=30
    //% degree.min=0 degree.max=180
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=4
    //% group="Servos"
    export function servo(index: Servos, degree: number): void {
        if (!initialized) {
            initPCA9685()
        }
        // 50hz
        let v_us = (degree * 1800 / 180 + 600) // 0.6ms ~ 2.4ms
        let value = v_us * 4096 / 20000
        setPwm(index + 7, 0, value)
    }

    /**
     * Control an individual DC motor with adjustable speed (0-255)
     * @param index motor M1-M4
     * @param direction clockwise or counter-clockwise
     * @param speed motor speed 0-255
    */
    //% weight=45
    //% blockId=motor_MotorRun block="Motor|%index|direction|%direction|speed|%speed"
    //% speed.min=0 speed.max=255 speed.defl=100
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=2
    //% direction.fieldEditor="gridpicker" direction.fieldOptions.columns=2
    //% group="Motors"
    export function MotorRun(index: Motors, direction: Dir, speed: number): void {
        if (!initialized) {
            initPCA9685()
        }

        // Validate motor index
        if (index > 4 || index <= 0)
            return

        // Validate and clamp speed input (0-255)
        speed = Math.max(0, Math.min(255, speed))

        // Convert direction enum to multiplier (CW=1, CCW=-1)
        let directionMultiplier = direction as number

        // Scale speed to PWM range (0-4095) with precise mapping for full torque
        // Formula: (speed * 4095) / 255 gives exact mapping
        // speed=255 -> pwmValue=4095 (100% duty cycle)
        let pwmValue = Math.round((speed * 4095) / 255) * directionMultiplier

        // Pin mapping and control
        if (index == 1) {
            // M1: pins 6-7 (U3 chip, normal operation)
            if (pwmValue >= 0) {
                setPwm(7, 0, pwmValue)
                setPwm(6, 0, 0)
            } else {
                setPwm(7, 0, 0)
                setPwm(6, 0, -pwmValue)
            }
        } else if (index == 2) {
            // M2: pins 4-5 (U3 chip, normal operation)
            if (pwmValue >= 0) {
                setPwm(5, 0, pwmValue)
                setPwm(4, 0, 0)
            } else {
                setPwm(5, 0, 0)
                setPwm(4, 0, -pwmValue)
            }
        } else if (index == 3) {
            // M3: Channel 2 (pins 2-3), REVERSED polarity
            // Need to brake M4 (Channel 1, pins 0-1)
            // Test showed: pin3 high → M3 CCW, so for CW we need pin2 high
            if (pwmValue >= 0) {
                // CW command → flip pins for reversed polarity
                setPwm(3, 0, 0)
                setPwm(2, 0, pwmValue)
            } else {
                // CCW command → flip pins for reversed polarity
                setPwm(3, 0, -pwmValue)
                setPwm(2, 0, 0)
            }
            // Brake M4
            setPwm(1, 0, brakePwmLevel)
            setPwm(0, 0, brakePwmLevel)
        } else if (index == 4) {
            // M4: Channel 1 (pins 0-1), REVERSED polarity
            // Need to brake M3 (Channel 2, pins 2-3)
            // Test showed: pin1 high → M4 CCW, so for CW we need pin0 high
            if (pwmValue >= 0) {
                // CW command → flip pins for reversed polarity
                setPwm(1, 0, 0)
                setPwm(0, 0, pwmValue)
            } else {
                // CCW command → flip pins for reversed polarity
                setPwm(1, 0, -pwmValue)
                setPwm(0, 0, 0)
            }
            // Brake M3
            setPwm(3, 0, brakePwmLevel)
            setPwm(2, 0, brakePwmLevel)
        }
    }

    /**
     * Move the mecanum wheel chassis in a direction with adjustable speed (0-255)
     * @param direction movement direction (forward, backward, strafe, rotate, diagonal)
     * @param speed movement speed 0-255
     */
    //% weight=100
    //% blockId=mecanum_move block="Move|%direction|at speed|%speed"
    //% speed.min=0 speed.max=255 speed.defl=100
    //% direction.fieldEditor="gridpicker" direction.fieldOptions.columns=2
    //% group="Mecanum Movement"
    export function mecanumMove(direction: MecanumDirection, speed: number = 100): void {
        if (!initialized) {
            initPCA9685()
        }

        // Clamp speed
        speed = Math.max(0, Math.min(255, speed))
        let pwmSpeed = Math.round((speed * 4095) / 255)

        // Helper to set U2 motors (M3 and M4) with proper polarity and brake mode
        function setU2Motors(m3Dir: number, m4Dir: number, pwm: number) {
            // Apply reversal if configured
            if (reverseM3) m3Dir = -m3Dir
            if (reverseM4) m4Dir = -m4Dir

            // M3 = Channel 2 (pins 2-3), reversed polarity
            // M4 = Channel 1 (pins 0-1), reversed polarity

            if (m3Dir > 0) {
                // M3 CW (accounting for reversed polarity: pin2 high)
                setPwm(3, 0, 0)
                setPwm(2, 0, pwm)
            } else if (m3Dir < 0) {
                // M3 CCW (accounting for reversed polarity: pin3 high)
                setPwm(3, 0, pwm)
                setPwm(2, 0, 0)
            } else {
                // M3 brake
                setPwm(3, 0, brakePwmLevel)
                setPwm(2, 0, brakePwmLevel)
            }

            if (m4Dir > 0) {
                // M4 CW (accounting for reversed polarity: pin0 high)
                setPwm(1, 0, 0)
                setPwm(0, 0, pwm)
            } else if (m4Dir < 0) {
                // M4 CCW (accounting for reversed polarity: pin1 high)
                setPwm(1, 0, pwm)
                setPwm(0, 0, 0)
            } else {
                // M4 brake
                setPwm(1, 0, brakePwmLevel)
                setPwm(0, 0, brakePwmLevel)
            }
        }

        // M1 and M2 helper - account for individual motor reversal
        function setM1M2(motor: number, dir: number, pwm: number) {
            // Apply reversal if configured
            if (motor == 1 && reverseM1) dir = -dir
            if (motor == 2 && reverseM2) dir = -dir

            if (motor == 1) {
                if (dir > 0) {
                    setPwm(7, 0, pwm)
                    setPwm(6, 0, 0)
                } else if (dir < 0) {
                    setPwm(7, 0, 0)
                    setPwm(6, 0, pwm)
                } else {
                    setPwm(7, 0, 0)
                    setPwm(6, 0, 0)
                }
            } else {
                if (dir > 0) {
                    setPwm(5, 0, pwm)
                    setPwm(4, 0, 0)
                } else if (dir < 0) {
                    setPwm(5, 0, 0)
                    setPwm(4, 0, pwm)
                } else {
                    setPwm(5, 0, 0)
                    setPwm(4, 0, 0)
                }
            }
        }

        // Apply movements - motor reversal handled in helper functions
        switch (direction) {
            case MecanumDirection.Forward:
                setM1M2(1, 1, pwmSpeed)
                setM1M2(2, 1, pwmSpeed)
                setU2Motors(-1, -1, pwmSpeed)  // Reversed due to mounting
                break

            case MecanumDirection.Backward:
                setM1M2(1, -1, pwmSpeed)
                setM1M2(2, -1, pwmSpeed)
                setU2Motors(1, 1, pwmSpeed)  // Reversed due to mounting
                break

            case MecanumDirection.StrafeRight:
                // Use M1+M2 only (right side) - they can go opposite directions
                setM1M2(1, -1, pwmSpeed)  // FR CCW
                setM1M2(2, 1, pwmSpeed)   // RR CW
                // M3+M4 brake (U2 chip can't do opposite directions)
                setU2Motors(0, 0, pwmSpeed)
                break

            case MecanumDirection.StrafeLeft:
                // Use M3+M4 only (left side) - they must go same direction due to U2 chip
                setM1M2(1, 0, 0)  // M1+M2 stop
                setM1M2(2, 0, 0)
                setU2Motors(1, 1, pwmSpeed)  // Reversed due to mounting
                break

            case MecanumDirection.RotateCW:
                setM1M2(1, 1, pwmSpeed)
                setM1M2(2, 1, pwmSpeed)
                setU2Motors(-1, -1, pwmSpeed)  // Reversed due to mounting
                break

            case MecanumDirection.RotateCCW:
                setM1M2(1, -1, pwmSpeed)
                setM1M2(2, -1, pwmSpeed)
                setU2Motors(1, 1, pwmSpeed)  // Reversed due to mounting
                break

            case MecanumDirection.DiagonalForwardRight:
                setM1M2(1, 0, 0)
                setM1M2(2, 1, pwmSpeed)
                setU2Motors(0, -1, pwmSpeed)  // M3 brake, M4 forward (reversed)
                break

            case MecanumDirection.DiagonalForwardLeft:
                setM1M2(1, 1, pwmSpeed)
                setM1M2(2, 0, 0)
                setU2Motors(-1, 0, pwmSpeed)  // M3 forward (reversed), M4 brake
                break

            case MecanumDirection.DiagonalBackwardRight:
                setM1M2(1, -1, pwmSpeed)
                setM1M2(2, 0, 0)
                setU2Motors(1, 0, pwmSpeed)  // M3 backward (reversed), M4 brake
                break

            case MecanumDirection.DiagonalBackwardLeft:
                setM1M2(1, 0, 0)
                setM1M2(2, -1, pwmSpeed)
                setU2Motors(0, 1, pwmSpeed)  // M3 brake, M4 backward (reversed)
                break
        }
    }

    /**
     * Stop an individual motor. Note: Stopping M3 or M4 stops both motors
     * @param index motor M1-M4 to stop
    */
    //% weight=40
    //% blockId=motor_motorStop block="Motor stop|%index"
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=2
    //% group="Motors"
    export function motorStop(index: Motors) {
        if (index == 1) {
            // M1: U3 chip
            setPwm(7, 0, 0)
            setPwm(6, 0, 0)
        } else if (index == 2) {
            // M2: U3 chip
            setPwm(5, 0, 0)
            setPwm(4, 0, 0)
        } else if (index == 3 || index == 4) {
            // M3 and M4 share U2 chip - stop both for safety
            setPwm(3, 0, 0)  // M3
            setPwm(2, 0, 0)
            setPwm(1, 0, 0)  // M4
            setPwm(0, 0, 0)
        }
    }

    /**
     * Stop all four motors immediately
    */
    //% weight=35
    //% blockId=motor_motorStopAll block="Motor Stop All"
    //% group="Motors"
    export function motorStopAll(): void {
        for (let idx = 1; idx <= 4; idx++) {
            motorStop(idx);
        }
    }


}

