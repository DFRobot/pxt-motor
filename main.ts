
//% weight=10 color=#DF6721 icon="\uf013" block="DF-Driver"
namespace motor {
    const PCA9685_ADDRESS = 0x67
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

    const STP_CHA_L = 2047
    const STP_CHA_H = 4095

    const STP_CHB_L = 1
    const STP_CHB_H = 2047

    const STP_CHC_L = 1023
    const STP_CHC_H = 3071

    const STP_CHD_L = 3071
    const STP_CHD_H = 1023


    const BYG_CHA_L = 3071
    const BYG_CHA_H = 1023

    const BYG_CHB_L = 1023
    const BYG_CHB_H = 3071

    const BYG_CHC_L = 4095
    const BYG_CHC_H = 2047

    const BYG_CHD_L = 2047
    const BYG_CHD_H = 4095

    export enum Stepper { 
        //% block="42BYGH"
        Ste1 = 1,
        //% block="28BYJ"
        Ste2 = 2
    }

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

    export enum Motors {
        M1 = 0x1,
        M2 = 0x2,
        M3 = 0x3,
        M4 = 0x4
    }

    export enum Dir {
        CW = 1,
        CCW = -1,
    }

    export enum Steppers {
        M1_M2 = 0x1,
        M3_M4 = 0x2
    }


    let initialized = false

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
        let prescale = prescaleval; //Math.Floor(prescaleval + 0.5);
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


    function setStepper_28(index: number, dir: boolean): void {
        if (index == 1) {
            if (dir) {
                setPwm(0, STP_CHA_L, STP_CHA_H);
                setPwm(2, STP_CHB_L, STP_CHB_H);
                setPwm(1, STP_CHC_L, STP_CHC_H);
                setPwm(3, STP_CHD_L, STP_CHD_H);
            } else {
                setPwm(3, STP_CHA_L, STP_CHA_H);
                setPwm(1, STP_CHB_L, STP_CHB_H);
                setPwm(2, STP_CHC_L, STP_CHC_H);
                setPwm(0, STP_CHD_L, STP_CHD_H);
            }
        } else {
            if (dir) {
                setPwm(4, STP_CHA_L, STP_CHA_H);
                setPwm(6, STP_CHB_L, STP_CHB_H);
                setPwm(5, STP_CHC_L, STP_CHC_H);
                setPwm(7, STP_CHD_L, STP_CHD_H);
            } else {
                setPwm(7, STP_CHA_L, STP_CHA_H);
                setPwm(5, STP_CHB_L, STP_CHB_H);
                setPwm(6, STP_CHC_L, STP_CHC_H);
                setPwm(4, STP_CHD_L, STP_CHD_H);
            }
        }
    }


    function setStepper_42(index: number, dir: boolean): void {
        if (index == 1) {
            if (dir) {
                setPwm(7, BYG_CHA_L, BYG_CHA_H);
                setPwm(6, BYG_CHB_L, BYG_CHB_H);
                setPwm(5, BYG_CHC_L, BYG_CHC_H);
                setPwm(4, BYG_CHD_L, BYG_CHD_H);
            } else {
                setPwm(7, BYG_CHC_L, BYG_CHC_H);
                setPwm(6, BYG_CHD_L, BYG_CHD_H);
                setPwm(5, BYG_CHA_L, BYG_CHA_H);
                setPwm(4, BYG_CHB_L, BYG_CHD_H);
            }
        } else {
            if (dir) {
                setPwm(3, BYG_CHA_L, BYG_CHA_H);
                setPwm(2, BYG_CHB_L, BYG_CHB_H);
                setPwm(1, BYG_CHC_L, BYG_CHC_H);
                setPwm(0, BYG_CHD_L, BYG_CHD_H);
            } else {
                setPwm(3, BYG_CHC_L, BYG_CHC_H);
                setPwm(2, BYG_CHD_L, BYG_CHD_H);
                setPwm(1, BYG_CHA_L, BYG_CHA_H);
                setPwm(0, BYG_CHB_L, BYG_CHD_H);
            }
        }
    }



    //% blockId=motor_servo block="Servo|%index|degree %degree"
    //% weight=100
    //% degree.min=0 degree.max=180
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function servo(index: Servos, degree: number): void {
        if (!initialized) {
            initPCA9685()
        }
        // 50hz: 20,000 us
        let v_us = (degree * 10 + 600) // 0.6 ~ 2.4
        let value = v_us * 4095 / 20000
        setPwm(index + 7, 0, value)
    }

    /**
	 * Execute a motor
     * @param Motors: M1A,M1B,M2A,M2B
     * @param CW: Clockwise direction
     * @param CCW: Counter clockwise direction
     * @param speed: 0~255
	*/
    //% blockId=motor_motor_run block="Motor|%index|dir %Dir|speed %speed"
    //% weight=90
    //% speed.min=0 speed.max=256
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function MotorRun(index: Motors, direction:Dir, speed: number): void {
        if (!initialized) {
            initPCA9685()
        }
        speed = speed * 16 * direction; // map 255 to 4096
        if (speed >= 4096) {
            speed = 4095
        }
        if (speed <= -4096) {
            speed = -4095
        }
        if (index > 4 || index <= 0)
            return
        let pn = (4-index) * 2
        let pp = (4-index) * 2 + 1 
        if (speed >= 0) {
            setPwm(pp, 0, speed)
            setPwm(pn, 0, 0)
        } else {
            setPwm(pp, 0, 0)
            setPwm(pn, 0, -speed)
        }
    }


    //% blockId=motor_stepper_degree_byg block="Stepper 42BYGH|%index|dir|%direction|degree|%degree"
    //% weight=80
    export function stepperDegree_42(index: Steppers, direction: Dir, degree: number): void {
        if (!initialized) {
            initPCA9685()
        }
        let Degree = Math.abs(degree);
        Degree = Degree * direction;
        setFreq(100);
        setStepper_42(index, Degree > 0);
        Degree = Math.abs(Degree);
        basic.pause((500 * Degree) / 360);
        if (index == 1) {
            motorStop(1)
            motorStop(2)
        }else{
            motorStop(3)
            motorStop(4)
        }
        setFreq(50);
    }


    //% blockId=motor_stepper_turn_byg block="Stepper 42BYGH|%index|dir|%direction|turn|%turn"
    //% weight=70
    export function stepperTurn_42(index: Steppers, direction: Dir, turn: number): void {
        let degree = turn * 360;
        stepperDegree_42(index, direction, degree);
    }

    //% blockId=motor_stepperDegree_28 block="Stepper 28BYJ-48|%index|dir|%direction|degree|%degree"
    //% weight=60
    export function stepperDegree_28(index: Steppers, direction: Dir, degree: number): void {
        if (!initialized) {
            initPCA9685()
        }
        let Degree = Math.abs(degree);
        Degree = Degree * direction;
        setFreq(100);
        setStepper_28(index, Degree > 0);
        Degree = Math.abs(Degree);
        basic.pause((500 * Degree) / 360);
        if (index == 1) {
            motorStop(1)
            motorStop(2)
        }else{
            motorStop(3)
            motorStop(4)
        }
        setFreq(50);
    }


    //% blockId=motor_stepperTurn_28 block="Stepper 28BYJ-48|%index|dir|%direction|turn|%turn"
    //% weight=50
    export function stepperTurn_28(index: Steppers, direction: Dir, turn: number): void {
        let degree = turn * 360;
        stepperDegree_28(index, direction, degree);
    }


    //% blockId=robotbit_stepperDegreeDual_42 block="Dual Stepper %stepper|M1_M2 dir %direction1|degree %degree1|M3_M4 dir%direction2|degree %degree2"
    //% weight=40
    export function stepperDegreeDual_42(stepper: Stepper, direction1: Dir, degree1: number, direction2: Dir,degree2: number): void {
        if (!initialized) {
            initPCA9685()
        }
        let timeout1 = 0;
        let timeout2 = 0;
        let timeout3 = 0;
        let Degree1 = Math.abs(degree1);
        let Degree1_ = Degree1;
        Degree1 = Degree1 * direction1;
        let Degree2 = Math.abs(degree2);
        let Degree2_ = Degree2;
        Degree2 = Degree2 * direction2;
        setFreq(100);

        if (stepper == 1) {
            timeout1 = 500 * Math.min(Degree1_, Degree2_) / 360;
            timeout2 = 500 * (Degree1_ - Degree2_) / 360;
            timeout3 = 500 * (Degree2_ - Degree1_) / 360;
            setStepper_42(1, Degree1 > 0);
            setStepper_42(2, Degree2 > 0);
        } else if (stepper == 2) {
            //
        } else { 
            //
        }
        basic.pause(timeout1);

        if (Degree1_ > Degree2_) {
            motorStop(3); motorStop(4);
            basic.pause(timeout2);
        } else {
            motorStop(1); motorStop(2);
            basic.pause(timeout3);
        }
        motorStopAll()
        setFreq(50);
    }

    //% blockId=robotbit_stepperTurnDual_42 block="Dual Stepper %stepper|M1_M2 dir %direction1|trun %trun1|M3_M4 dir%direction2|trun %trun2"
    //% weight=30
    export function stepperTurnDual_42(stepper: Stepper, direction1: Dir, trun1: number, direction2: Dir,trun2: number): void {
        if (!initialized) {
            initPCA9685()
        }
        let degree1 = trun1 * 360;
        let degree2 = trun2 * 360;
        
        if (stepper == 1) {
            stepperDegreeDual_42(1, direction1, degree1, direction2, degree1);
        } else if (stepper == 2) {
            //stepperDegreeDual_28(direction1, degree1, direction2, degree1);
        } else { 

        }
        
    }

    //% blockId=motor_motorStop block="Motor stop|%index"
    //% weight=20
    function motorStop(index: Motors) {
        setPwm((4 - index) * 2, 0, 0);
        setPwm((4 - index) * 2 + 1, 0, 0);
    }


    //% blockId=motor_stop_all block="Motor Stop All"
    //% weight=10
    export function motorStopAll(): void {
        for (let idx = 1; idx <= 4; idx++) {
            motorStop(idx);
        }
    }
}

