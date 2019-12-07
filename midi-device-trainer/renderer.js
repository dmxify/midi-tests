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

electronMidi.onReady = () => {
  midiDeviceManager.loadAll(electronMidi.midiAccess);
};

electronMidi.onHardwareChange = () => {
  midiDeviceManager.loadAll(electronMidi.midiAccess);
};

electronMidi.onInputMessage = (e) => {
  midiDeviceManager.onInputMessage(e);
  // midi gui
  showInputMessage(e);
  // midi gui
  flashElement('comIndicator_MidiInput');
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
  } else {
    console.log('Renderer: midiDeviceControl already bound!');
  }

}

// midi gui
let timeouts = {};


function refreshDom() {
  let divInputDevices = document.getElementById("divInputDevices");
  divInputDevices.innerHTML = ""; // clear old DOM
  clearDevices();
  for (let input of electronMidi.inputs.values()) {
    var device = document.createElement("div");
    device.innerHTML = input.name;
    device.classList.add('device');
    divInputDevices.appendChild(device);

    renderDevice(input.id, input.name, input.manufacturer, MidiDeviceConfig.readConfig(input.name));
  }

  let divOutputDevices = document.getElementById("divOutputDevices");
  divOutputDevices.innerHTML = ""; // clear old DOM
  for (let output of electronMidi.outputs.values()) {
    var device = document.createElement("div");
    device.innerHTML = output.name;
    device.classList.add('device');
    divOutputDevices.appendChild(device);
  }


  document.getElementById("divStatusMessages").innerHTML = `Device list updated [${getTime()}]`;

};

function showInputMessage(e) {
  document.getElementById("divStatusMessages").innerHTML = `${e.srcElement.name}: [${e.data[0]},${e.data[1]},${e.data[2]}]`;
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
  spanName.appendChild(i);
  spanName.appendChild(document.createTextNode(`${manufacturer} ~ ${name} `));
  newDevice.appendChild(spanName);

  // table containing controls
  let table = document.createElement("table");
  let thead = document.createElement("thead");
  let tbody = document.createElement("tbody");
  let tr = document.createElement("tr");

  let th_id = document.createElement("th");
  let tr_name = document.createElement("th");
  let tr_type = document.createElement("th");
  let tr_bindings = document.createElement("th");
  let tr_input = document.createElement("th");
  let tr_output = document.createElement("th");

  th_id.appendChild(document.createTextNode('#'));
  tr_name.appendChild(document.createTextNode('Name'));
  tr_type.appendChild(document.createTextNode('Type'));
  tr_bindings.appendChild(document.createTextNode('Bindings'));
  tr_input.appendChild(document.createTextNode('Input'));
  tr_output.appendChild(document.createTextNode('Output'));

  tr.appendChild(th_id);
  tr.appendChild(tr_name);
  tr.appendChild(tr_type);
  tr.appendChild(tr_bindings);
  tr.appendChild(tr_input);
  tr.appendChild(tr_output);

  thead.appendChild(tr);
  table.appendChild(thead);
  table.appendChild(tbody);
  newDevice.appendChild(table);

  document.getElementById("divDevices").appendChild(newDevice);

  if (controls != null && typeof controls[Symbol.iterator] === 'function') {
    for (control of controls) {
      renderControl(newDevice.id, control.id, control.name, control.type, control.bindings, control.isInput, control.isOutput);
    }
  }
}

function renderControl(deviceId, id, name, type, bindings, input, output) {
  let html_midiDevice = document.getElementById("MidiDevice1");
  let html_tbody = html_midiDevice.querySelector("tbody");
  // get existing item and delete it.

  // add new item
  let newRow = document.createElement("tr");
  newRow.dataset.deviceId = deviceId;

  let td_id = document.createElement("td");
  let td_name = document.createElement("td");
  let td_type = document.createElement("td");
  let td_bindings = document.createElement("td");
  let td_input = document.createElement("td");
  let td_output = document.createElement("td");
  td_id.appendChild(document.createTextNode(id));
  td_name.appendChild(document.createTextNode(name));
  td_type.appendChild(document.createTextNode(type));
  td_bindings.appendChild(document.createTextNode(bindings));
  td_input.appendChild(document.createTextNode(input));
  td_output.appendChild(document.createTextNode(output));

  newRow.appendChild(td_id);
  newRow.appendChild(td_name);
  newRow.appendChild(td_type);
  newRow.appendChild(td_bindings);
  newRow.appendChild(td_input);
  newRow.appendChild(td_output);
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
