/**
 * Some basic examples for controlling your led's using the sp108e.
 *
 * Update the ip address for your own device
 */
const { sp108e, ANIM_MODE_FLOW, ANIM_MODE_STATIC } = require("../sp108e_raw");

const sp108e_options = {
  host: "192.168.5.115",
  port: 8189,
};

const test = async () => {
  const p = new sp108e(sp108e_options);

  await p.getStatus();

  if (p.status.result == "OK") {
    await p.toggleOnOff();
    await p.setColor("ffffff");
    await p.setAnimationMode(ANIM_MODE_FLOW);
    await p.setAnimationSpeed(255);
    await p.setDreamMode(1);
    await p.setColor("FF6717", ANIM_MODE_STATIC);
    await p.setBrightness(255);
  }
};

test();
