const {
  ipcRenderer,
  shell
} = require('electron');

//open links externally by default
const linksToBrowser = require('electron-hyperlinks-to-browser')

/* require the electron-midi module for testing (relative path): */
const ElectronMidi = require('../../../electron-midi/index.js')
/* require the electron-midi module for testing (node_modules path): */
//const ElectronMidi = require('electron-midi')
const electronMidi = new ElectronMidi();

const MidiDeviceManager = require('../../midi-device-manager/index.js');
const midiDeviceManager = new MidiDeviceManager;

electronMidi.onReady = async () => {
  await midiDeviceManager.loadAll(electronMidi.midiAccess);
  updateUI();
  //wave()
};

electronMidi.onHardwareChange = async () => {
  await midiDeviceManager.loadAll(electronMidi.midiAccess);
  onDeviceStateChange()
};

electronMidi.onInputMessage = (e) => {
  midiDeviceManager.onInputMessage(e);
  // midi gui
  showInputMessage(e);
  // midi gui
  flashElement('comIndicator_MidiInput');
  flashMidiDeviceControl(e);
}

electronMidi.onOutputMessage = (e) => {
  // midi gui
  midiDeviceManager.onOutputMessage(e);
  flashElement('comIndicator_MidiOutput', 160);
}

midiDeviceManager.onTrained = (midiDevice, midiDeviceControl) => {
  if (midiDeviceControl) {
    console.log('Renderer: a new MidiDeviceControl has been bound to MidiDevice:');
    console.log(`${midiDevice.name} - ${midiDeviceControl.name}`);
    midiDeviceManager.saveAll();
  } else {
    console.log('Renderer: midiDeviceControl already bound!');
  }

}

midiDeviceManager.onSaved = (e) => {
  updateUI();
}

// midi gui
let timeouts = {};

function updateUI() {
  let divInputDevices = document.getElementById("divInputDevices");
  divInputDevices.innerHTML = ""; // clear old DOM
  clearDevices();
  for (let input of midiDeviceManager.midiDevices) {
    var device = document.createElement("div");
    device.dataset.id = input.id;
    device.appendChild(document.createTextNode(input.name));
    var cbUIEnabled = document.createElement('input');
    cbUIEnabled.type = 'checkbox';
    cbUIEnabled.checked = input.options.enabled;
    cbUIEnabled.addEventListener('change', (e) => {
      midiDeviceManager.getMidiDeviceById(e.target.parentElement.dataset.id).options.enabled = e.target.checked;
      midiDeviceManager.saveAll().then(updateUI());
    });
    device.appendChild(cbUIEnabled);
    device.classList.add('device');
    divInputDevices.appendChild(device);
    if (input.options.enabled) {
      renderDevice(input.id, input.name, input.manufacturer, input.midiDeviceControls, input.options.imagePath);
    }
  }
}


function onDeviceStateChange() {
  // let divInputDevices = document.getElementById("divInputDevices");
  // divInputDevices.innerHTML = ""; // clear old DOM
  // clearDevices();
  // for (let input of electronMidi.inputs.values()) {
  //   var device = document.createElement("div");
  //   device.innerHTML = input.name;
  //   device.classList.add('device');
  //   divInputDevices.appendChild(device);
  //
  //   renderDevice(input.id, input.name, input.manufacturer, MidiDeviceConfig.readConfig(input.name));
  // }
  //
  // let divOutputDevices = document.getElementById("divOutputDevices");
  // divOutputDevices.innerHTML = ""; // clear old DOM
  // for (let output of electronMidi.outputs.values()) {
  //   var device = document.createElement("div");
  //   device.innerHTML = output.name;
  //   device.classList.add('device');
  //   divOutputDevices.appendChild(device);
  // }
  updateUI();

  toast('Device list updated', getTime());
};

function showInputMessage(e) {
  document.getElementById("divStatusMessages").innerHTML = `${e.target.name}: [0x${e.data[0].toString(16)},0x${e.data[1].toString(16)},${e.data[2]}]`;
}

function flashMidiDeviceControl(e) {
  const controls = document.querySelectorAll("[data-device-id]");
  for (let control of controls.values()) {
    if (control.textContent.indexOf(`${e.data[0]} ${e.data[1]} ${e.data[2]}`) !== -1 || control.textContent.indexOf(`${e.data[0]} ${e.data[1]} X`) !== -1) {
      addTemporaryClass(control, "triggered", 175);
    }
  }
}


function getTime() {
  var today = new Date();
  var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  return time;
}

document.getElementById("btnLearn").addEventListener("click", () => {
  document.getElementById("divLearnInput").innerHTML = 'Now press any button on your Midi Device to learn it';

  electronMidi.learn()
    .then((result) => {
      document.getElementById("divLearnInput").innerHTML = `Learnt: ${result.input}:[${result.data[0]},${result.data[1]},${result.data[2]}]`;
    });
});

document.getElementById("btnTrain").addEventListener("click", () => {
  if (!midiDeviceManager.isTrainingMode) {
    midiDeviceManager.startTraining();
    document.getElementById("btnTrain").innerHTML = 'Stop Training';
  } else {
    document.getElementById("btnTrain").innerHTML = 'Train MIDI Device';
    midiDeviceManager.stopTraining();
  }
});

document.getElementById("btnSaveAll").addEventListener("click", () => {
  midiDeviceManager.saveAll().then(toast("MIDI devices", "Have been saved"));
})

function clearDevices() {
  // document.getElementById("divDevices").InnerHTML = '';
  for (device of document.querySelectorAll(".midi-device")) {
    device.remove();
  }
}

function renderDevice(id, name, manufacturer, controls) {
  let newDevice = document.createElement("div");
  newDevice.id = id;
  newDevice.classList.add("midi-device");
  // device info
  //newDevice.appendChild(document.createTextNode("Midi Device: "));
  let i = document.createElement("i");
  i.appendChild(document.createTextNode("MIDI bindings:"));
  let spanName = document.createElement("span");
  // spanName.appendChild(document.createTextNode(`${manufacturer} ~ ${name} `));
  spanName.appendChild(i);
  spanName.innerHTML += `${manufacturer} ~ ${name} `;
  newDevice.appendChild(spanName);

  // table containing controls
  let table = document.createElement("table");
  let thead = document.createElement("thead");
  let tbody = document.createElement("tbody");
  let tr = document.createElement("tr");

  let th_id = document.createElement("th");
  let tr_name = document.createElement("th");
  let tr_type = document.createElement("th");
  let tr_subType = document.createElement("th");
  let tr_mode = document.createElement("th");
  let tr_bindings = document.createElement("th");
  let tr_edit = document.createElement("th");

  th_id.appendChild(document.createTextNode('#'));
  tr_name.appendChild(document.createTextNode('Name'));
  tr_type.appendChild(document.createTextNode('Type'));
  tr_subType.appendChild(document.createTextNode('Sub Type'));
  tr_mode.appendChild(document.createTextNode('Mode'));
  tr_bindings.appendChild(document.createTextNode('Bindings'));
  tr_edit.appendChild(document.createTextNode(''));

  tr.appendChild(th_id);
  tr.appendChild(tr_name);
  tr.appendChild(tr_type);
  tr.appendChild(tr_subType);
  tr.appendChild(tr_mode);
  tr.appendChild(tr_bindings);
  tr.appendChild(tr_edit);

  thead.appendChild(tr);
  table.appendChild(thead);
  table.appendChild(tbody);
  newDevice.appendChild(table);

  document.getElementById("divDevices").appendChild(newDevice);

  for (let control of controls) {
    renderControl(newDevice.id, control._id, control._name, control._type, control._subType, control._mode, control._midiMessageBindings);
  }
}

function renderControl(deviceId, id, name, type, subType, mode, midiMessageBindings) {
  let html_midiDevice = document.getElementById(deviceId);
  let html_tbody = html_midiDevice.querySelector("tbody");
  // get existing item and delete it.

  // add new item
  let newRow = document.createElement("tr");
  newRow.id = deviceId + '_' + id;
  newRow.dataset.deviceId = deviceId;

  let td_id = document.createElement("td");
  let td_name = document.createElement("td");
  let td_type = document.createElement("td");
  let td_subType = document.createElement("td");
  let td_mode = document.createElement("td");
  let td_bindings = document.createElement("td");
  let td_edit = document.createElement("td");
  td_id.appendChild(document.createTextNode(id));
  td_name.appendChild(document.createTextNode(name));
  td_type.appendChild(document.createTextNode(type));
  td_subType.appendChild(document.createTextNode(subType));
  td_mode.appendChild(document.createTextNode(mode));
  switch (type) {
    case 'BUTTON':
      for (let binding of midiMessageBindings) {
        td_bindings.appendChild(document.createTextNode(`${binding[0]} ${binding[1]} ${binding[2]} | `));
      }
      break;
    case 'FADER':
      td_bindings.appendChild(document.createTextNode(`${midiMessageBindings[0][0]} ${midiMessageBindings[0][1]} X`));
      break;
    default:
      break;
  }
  //<a class="button4" id="btnTrain">Train MIDI Device</a>

  //deleteMidiDeviceControl
  btnDelete = document.createElement('a');
  btnDelete.dataset.deviceId = deviceId;
  btnDelete.dataset.controlId = id;
  btnDelete.classList.add("button-delete");
  btnDelete.appendChild(document.createTextNode('x'));
  btnDelete.addEventListener('click', (e) => {
    midiDeviceManager.midiDevice_removeMidiDeviceControl(e.target.dataset.deviceId, e.target.dataset.controlId);
    // .then(() => {
    //   document.getElementById(newRow.id).remove();
    // });
  })
  td_edit.appendChild(btnDelete);

  newRow.appendChild(td_id);
  newRow.appendChild(td_name);
  newRow.appendChild(td_type);
  newRow.appendChild(td_subType);
  newRow.appendChild(td_mode);
  newRow.appendChild(td_bindings);
  newRow.appendChild(td_edit);
  html_tbody.appendChild(newRow);
}
//renderControl()


function flashElement(elementId, duration = 100) {
  clearTimeout(timeouts[elementId]);
  document.getElementById(elementId).classList.add("on");
  timeouts[elementId] = setTimeout(() => {
    document.getElementById(elementId).classList.remove("on");
  }, duration);
}

function addTemporaryClass(element, className, duration = 250) {
  clearTimeout(timeouts[getHash(element.textContent)]);
  element.classList.add(className);
  timeouts[getHash(element.textContent)] = setTimeout(() => {
    element.classList.remove(className);
  }, duration);
}

function getHash(input) {
  var hash = 0,
    len = input.length;
  for (var i = 0; i < len; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0; // to 32bit integer
  }
  return hash;
}


async function toast(
  title = "",
  text = "",
  style = {},
  duration = 3500
) {
  var toast = document.createElement("div");
  let styleDefaults = {
    //"backgroundColor": "#303030e8",
    "backgroundColor": "#e8e8e8e8",
    "color": "#000000",
    "width": "250px",
    "height": "45px",
    "boxShadow": "0 0 7px 10px #e8e8e8e8",
    "position": "absolute",
    "zIndex": "9",
    "top": "-57px",
    "left": "0",
    "right": "0",
    "marginLeft": "auto",
    "marginRight": "auto",
    "borderBottomLeftRadius": "15px",
    "borderBottomRightRadius": "15px",
    "transition": "top 0.4s"
  };
  let derivedStyle = Object.assign(styleDefaults, style);
  Object.assign(toast.style, derivedStyle);
  // add title
  let t = document.createElement("span");
  t.style.size = '14px';

  t.appendChild(document.createTextNode(title));
  toast.appendChild(t);
  toast.appendChild(document.createTextNode(text));
  // add text
  // add to body
  document.body.appendChild(toast);
  // slide in
  setTimeout(() => {
    toast.style.top = "0px";
  }, 0);
  // slide out
  setTimeout(() => {
    toast.style.top = "-57px";
  }, duration);
}

// variables needed:
// desired resolution
// physical coordinates of midi device controls
//
// for each coordinate, check if midi device control output is rgb light
//
// run pattern, and if one of the coordinates is in the bounds of a control, light it up.


function wave(midiOutputPortName = 'APC40 mkII') {
  var arrData = Array.from(Array(40), (x, idx) => [147, idx, idx]);
  let ch = 147;
  setInterval(() => {
    arrData.forEach((val, idx) => {
      arrData[idx][2] = (val[2] + 40) % 127;
    });
    console.log(arrData[0]);
    electronMidi.sendAll(midiOutputPortName, arrData);
  }, 500);
}

function flow(midiOutputPortName = 'APC40 mkII') {
  var arrData = Array.from(Array(40), (x, idx) => [147, idx, (idx * 2)]);
  let ch = 147;
  setInterval(() => {
    arrData.forEach((val, idx) => {
      arrData[idx][2] = (val[2] + 41) % 127;
    });
    console.log(arrData[0]);
    electronMidi.sendAll(midiOutputPortName, arrData);
  }, 500);
}
