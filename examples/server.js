/**
 * A really simple web service to control your led's using the sp108e.
 *
 * Example usage:
 *
 * http://localhost:3000/?on
 * http://localhost:3000/?toggle
 * http://localhost:3000/?brightness=255
 * http://localhost:3000/?color=ffffff&animmode=D3
 * http://localhost:3000/?dreammode=1
 * http://localhost:3000/?animspeed=128
 *
 * It can also we called with natural language which allows it to be called from Google Home using IFTTT:
 *
 * http://localhost:3000/?command=color red
 * http://localhost:3000/?command=color raindow
 * http://localhost:3000/?command=brightness 100
 *
 * NOTE: Update the ip address for your own device
 */
const express = require("express");
const { sp108e, COLOR_MAP } = require("../sp108e_raw");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 8189;

const sp108e_options = {
  host: "192.168.5.114",
  port: 8189,
};

app.get("/", async (req, res) => {
  console.log(req.query);
  if (Object.keys(req.query).length === 0) {
    const html = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf8");
    res.send(html);
    return;
  }

  const p = new sp108e(sp108e_options);
  let responses = [];
  try {
    for (var propName in req.query) {
      if (propName === "command") {
        // coming from google home as a string
        // eg:
        //      "Hey Google, Front lights color red"  would call
        //      "?command=color red"
        responses.push(
          await runNaturalLanguageCommand(p, req.query.command.split(" "))
        );
      } else if (req.query.hasOwnProperty(propName)) {
        // By passing in parameters directly you can change multiple settings at once
        // eg:
        //      "?power=on&color=red&brightness=200"
        responses.push(
          await runNaturalLanguageCommand(p, [propName, req.query[propName]])
        );
      }
    }

    res.send({ sp108e: "OK", responses });
  } catch (err) {
    console.log(err);
    responses.push(err);
    res.send({ sp108e: "FAIL", err: err.toString() });
  }
});

app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);

getNaturalLanguageNumber = (s) => {
  if (s === "to") {
    return 2;
  }
  return toNumber(s);
};

runNaturalLanguageCommand = async (p, cmd) => {
  console.log("Running natural language command:", cmd);
  if (cmd[0] === "color" || cmd[0] === "colour") {
    const colorname = cmd.slice(1).join("").toLowerCase();
    //const hex = COLOR_MAP[colorname];
    if (colorname) {
      console.log("Setting color", colorname);
      return await p.setColor(colorname);
    }


    console.log("Unable to find color", colorname);
  }

  if (cmd[0] === "speed") {
    try {
      const speed = p.getNaturalLanguageNumber(cmd[1]);
      return await p.setSpeed(speed);
    } catch (err) { }
  }

  if (cmd[0] === "brightness") {
    try {
      const brightness = parseInt(cmd[1]) || getNumber(colorname);
      return await p.setBrightness(brightness);
    } catch (err) { }
  }

  if (cmd[0] === "dreammode") {
    try {
      const dreamode = parseInt(cmd[1]) || getNumber(colorname);
      console.log("d", dreamode);
      return await p.setDreamMode(dreamode);
    } catch (err) {
      const random = Math.ceil(Math.random() * 180);
      return await p.setDreamMode(random);
    }
  }

  if (cmd[0] === "next") {
    return await p.nextDreamMode();
  }

  if (cmd[0] === "previous") {
    return await p.prevDreamMode();
  }

  if (cmd[0] === "toggle" || cmd[0] === "power" || cmd[0] === "turn") {
    if (cmd.length === 1) {
      return await p.toggleOnOff();
    } else if (cmd[1] === "off") {
      return await p.off();
    } else {
      return await p.on();
    }
  }

  if (cmd[0] === "on") {
    return await p.on();
  }

  if (cmd[0] === "off") {
    return await p.off();
  }

  if (cmd[0] === "static") {
    await p.setAnimationMode(ANIM_MODE_STATIC);
  }

  if (cmd[0] === "normal" || cmd[0] === "reset" || cmd[0] === "warm") {
    await p.setAnimationMode(ANIM_MODE_STATIC);
    await p.setColor("FF6717");
    await p.setBrightness(5);
    return await p.on();
  }

  if (cmd[0] === "power") {
    try {
      return await p.toggleOnOff();
    } catch (err) { }
  }

  if (cmd[0] === "status") {
    try {
      return await p.getStatus();
    } catch (err) { }
  }

  return `Unable to process ${cmd}`;
};