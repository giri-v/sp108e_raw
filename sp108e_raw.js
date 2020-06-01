/**
 * Porting https://github.com/Lehkeda/SP108E_controller from PHP to JS
 *
 * Please contribute and improve. Its very basic right now!
 */
const net = require("net");
const toNumber = require("english2number");
const COLOR_MAP = require("./colors.js");
const ANIMATION_MAP = require("./animations.js");
const { PromiseSocket } = require("promise-socket");
const CHIP_TYPES = require("./chip-types.js");
const COLOR_ORDERS = require("./color-orders.js");

const ANIM_MODE_STATIC = "D3";

const WARM_WHITE = "FF6717"; // Matches house lights

const CMD_GET_NAME = "77";
const CMD_GET_STATUS = "10";
const CMD_PREFIX = "38";
const CMD_SUFFIX = "83";
const CMD_TOGGLE = "aa";
const CMD_SET_ANIMATION_MODE = "2c";
const CMD_SET_BRIGHTNESS = "2a"; // Param: 00-FF
const CMD_SET_SPEED = "03"; // Param: 00-FF
const CMD_SET_COLOR = "22"; // RGB: 000000-FFFFFF
const CMD_SET_DREAM_MODE = "2C"; // Param: 1-180
const CMD_SET_CHIP_TYPE = "1C"; // Param: 1-180
const CMD_SET_COLOR_ORDER = "3C"; // Param: 1-180
const CMD_SET_NAME_MODE = "14"; // Param: 1-180
const CMD_SET_TOTAL_SEGMENTS = "2e"; // Param: 1-180
const CMD_SET_LEDS_PER_SEGMENT = "2d"; // Param: 1-180

const NO_PARAMETER = "000000";

function hex_to_ascii(str1) {
  var hex = str1.toString();
  var str = '';
  for (var n = 0; n < hex.length; n += 2) {
    str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
  }
  return str;
}

function bin2hex(s) {
  //  discuss at: https://locutus.io/php/bin2hex/
  // original by: Kevin van Zonneveld (https://kvz.io)
  // bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
  // bugfixed by: Linuxworld
  // improved by: ntoniazzi (https://locutus.io/php/bin2hex:361#comment_177616)
  //   example 1: bin2hex('Kev')
  //   returns 1: '4b6576'
  //   example 2: bin2hex(String.fromCharCode(0x00))
  //   returns 2: '00'

  var i
  var l
  var o = ''
  var n

  s += ''

  for (i = 0, l = s.length; i < l; i++) {
    n = s.charCodeAt(i)
      .toString(16)
    o += n.length < 2 ? '0' + n : n
  }

  return o
}

class sp108e {
  /*
   * @param {Object} options.
   *
   * Example options:
   *
   *  const options = {
   *    host: "192.168.0.124",
   *    port: 8189,
   *  };
   */
  constructor(options) {
    if (!options || !options.host) {
      throw "options are mandatory in the constructor of sp108e";
    }

    this.options = options;

    if (!options.chip)
      options.chip = CHIP_TYPES.WS2811;

    if (!options.colorOrder)
      options.colorOrder = COLOR_ORDERS.GBR;


  }


  setChipType = async (chipType) => {
    return await this.send(CMD_SET_CHIP_TYPE, chipType, 0);
  }

  setColorOrder = async (colorOrder) => {
    return await this.send(CMD_SET_COLOR_ORDER, colorOrder, 0);
  }

  setName = async (deviceName) => {
    const response = await this.send(CMD_SET_NAME_MODE, NO_PARAMETER, 1);
    return await this.send_data(bin2hex(deviceName))
  }

  setTotalSegments = async () => {
    return await this.send(CMD_SET_NAME_MODE, NO_PARAMETER, 1);
  }

  /**
   * Toggles the led lights on or off
   */
  toggleOnOff = async () => {
    return await this.send(CMD_TOGGLE, NO_PARAMETER, 17);
  };

  /**
   * Toggles the led lights on
   */
  off = async () => {
    const status = await this.getStatus();
    if (status.on) {
      return await this.toggleOnOff();
    } else {
      console.log("already off");
    }
  };

  /**
   * Toggles the led lights on
   */
  on = async () => {
    const status = await this.getStatus();
    if (!status.on) {
      return await this.toggleOnOff();
    } else {
      console.log("already on");
    }
  };

  /**
   * Toggles the led lights off
   */
  toggleOnOff = async () => {
    return await this.send(CMD_TOGGLE, NO_PARAMETER, 17);
  };

  /**
   * Gets the status of the sp108e, on/off, color, etc
   */
  getStatus = async () => {
    var response = "";
    var status = { result: "unknown" }
    try {
      response = await this.send(CMD_GET_STATUS, NO_PARAMETER, 17);
      status = {
        result: "OK",
        on: response.substring(2, 4) === "01",
        animationMode: parseInt(response.substring(4, 6), 16) + 1,
        speed: parseInt(response.substring(6, 8), 16),
        brightness: parseInt(response.substring(8, 10), 16),
        colorOrder: response.substring(10, 12),
        ledsPerSegment: parseInt(response.substring(12, 16), 16),
        numberOfSegments: parseInt(response.substring(16, 20), 16),
        color: response.substring(20, 26),
        icType: response.substring(26, 28),
        recordedPatterns: parseInt(response.substring(28, 30), 16),
        whiteBrightness: parseInt(response.substring(30, 32), 16),
      };
    }
    catch (e) {
      status = {
        result: "FAIL",
        message: e.toString()
      };
    }
    this.status = status;
    console.log(this.status);

    return status;
  };

  getName = async () => {
    const response = await this.send(CMD_GET_NAME, NO_PARAMETER, 14);
    this.name = hex_to_ascii(response.substring(2));
    return this.name;
  }

  /**
   * Sets the brightness of the leds
   * @param {integer} brightness any integer from 0-255
   */
  setBrightness = async (brightness) => {
    return await this.send(CMD_SET_BRIGHTNESS, this.intToHex(brightness), 0);
  };

  /**
   * Sets the color of the leds
   * @param {string} hexColor Hex color without hash. e.g, "FFAABB"
   */
  setColor = async (hexColor) => {
    const status = await this.getStatus();
    if (status.animationMode === "00") {
      await this.send(CMD_SET_ANIMATION_MODE, exports.ANIM_MODE_STATIC);
    }
    return await this.send(CMD_SET_COLOR, hexColor, 0);
  };

  /**
   * Sets the animation mode of the leds (for single color mode)
   * @param {string} animMode Animation mode. Use the ANIM_MODE_XXXX constants, otherwise 2 character hex. e.g, "CD". Defaults to ANIM_MODE_STATIC
   */
  setAnimationMode = async (animMode) => {
    return await this.send(CMD_SET_ANIMATION_MODE, animMode);
  };

  /**
   * Sets the speed of the animation
   * @param {integer} speed any integer 0-255
   */
  setAnimationSpeed = async (speed) => {
    return await this.send(CMD_SET_SPEED, this.intToHex(speed), 0);
  };

  /**
   * Sets the dreamcolor animation style (1=rainbow) from 1-180
   * @param {integer} speed any integer 1-180
   */
  setDreamMode = async (mode) => {
    let truncated = Math.min(mode, 180);
    truncated = Math.max(truncated, 1);
    return await this.send(CMD_SET_DREAM_MODE, this.intToHex(mode - 1), 0);
  };

  nextDreamMode = async () => {
    try {
      const status = await this.getStatus();
      let animation = status.animationMode + 1;
      if (animation > 180) animation = 1;
      return await this.setDreamMode(animation);
    } catch (err) {
      console.log("err", err);
    }
  }

  prevDreamMode = async () => {
    try {
      const status = await this.getStatus();
      let animation = status.animationMode - 1;
      if (animation < 1) animation = 180;
      return await this.setDreamMode(animation);
    } catch (err) {
      console.log("err", err);
    }
  }

  intToHex = (int) => {
    return int.toString(16).padStart(2, "0");
  };

  send = async (cmd, parameter = NO_PARAMETER, responseLength = 0) => {
    const hex = CMD_PREFIX + parameter.padEnd(6, "0") + cmd + CMD_SUFFIX;
    return this.send_hex(hex, responseLength);
  };

  send_hex = async (hexad, responseLength = 0) => {
    const rawHex = Buffer.from(hexad, "hex");
    return this.send_data(rawHex, responseLength);
  };


  send_data = async (rawHex, responseLength = 0) => {
    const socket = new net.Socket();
    const client = new PromiseSocket(socket);
    await client.connect(this.options.port, this.options.host);
    console.log("connected to sp108e");
    await client.write(rawHex);
    console.log("tx", rawHex.toString("hex"));

    let response = undefined;
    if (responseLength > 0) {
      response = await client.read(responseLength);
      console.log("rx", response.toString("hex"));
    }

    await client.end();

    if (responseLength === 0) {
      // Just a little hacky sleep to stop the sp108e getting overwhelmed by sequential writes
      await this.sleep();
    }
    return response ? response.toString("hex") : "";
  };


  sleep = () => {
    return new Promise((resolve) => setTimeout(resolve, 250));
  };


}

exports.sp108e = sp108e;

exports.ANIM_MODE_METEOR = "CD";
exports.ANIM_MODE_BREATHING = "CE";
exports.ANIM_MODE_WAVE = "D1";
exports.ANIM_MODE_CATCHUP = "D4";
exports.ANIM_MODE_STATIC = "D3";
exports.ANIM_MODE_STACK = "CF";
exports.ANIM_MODE_FLASH = "D2";
exports.ANIM_MODE_FLOW = "D0";
