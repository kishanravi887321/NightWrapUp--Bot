import { FRONTEND_URL } from "./modules/constants.js";
import { ApiError, createLibrary, loadLibraries } from "./modules/api.js";
import {
  clearExtensionToken,
  getExtensionToken,
  getSelectedLibraryId,
  setSelectedLibraryId
} from "./modules/storage.js";

const statusElement = document.querySelector("#status");
const contentElement = document.querySelector("#content");

init();

async function init() {
  setStatus("Loading...", "loading");
  const token = await getExtensionToken();
  if (!token) {
    renderConnectState();
    return;
  }

  try {
    const libraries = await loadLibraries();
    const selectedLibraryId = await getSelectedLibraryId();
    renderLibraryState(libraries, selectedLibraryId);
  } catch (error) {
    renderError(error);
  }
}

function renderConnectState() {
  setStatus("This extension is not connected.", "info");
  contentElement.replaceChildren(
    createText("Connect it through NightWrapUp to load your libraries."),
    createButton("Open NightWrapUp", () => {
      chrome.tabs.create({ url: FRONTEND_URL });
    }),
    createButton("Clear stored connection", async () => {
      await clearExtensionToken();
      setStatus("Stored connection cleared.", "success");
    }, "secondary")
  );
}

function renderLibraryState(libraries, selectedLibraryId) {
  const libraryList = Array.isArray(libraries) ? libraries : [];
  const createForm = document.createElement("form");
  createForm.className = "library-create-form";
  createForm.hidden = true;
  const nameInput = document.createElement("input");
  nameInput.placeholder = "New library name";
  nameInput.maxLength = 80;
  nameInput.required = true;
  nameInput.setAttribute("aria-label", "New library name");
  const descriptionInput = document.createElement("input");
  descriptionInput.placeholder = "Description (optional)";
  descriptionInput.maxLength = 240;
  descriptionInput.setAttribute("aria-label", "Library description");
  const createButtonElement = createButton("Create library", async () => {
    await createNewLibrary(nameInput, descriptionInput, createButtonElement);
  });
  createForm.append(nameInput, descriptionInput, createButtonElement);
  createForm.addEventListener("submit", (event) => {
    event.preventDefault();
    createButtonElement.click();
  });

  const addButton = createButton("+", () => {
    createForm.hidden = !createForm.hidden;
    addButton.setAttribute("aria-expanded", String(!createForm.hidden));
    addButton.title = createForm.hidden ? "Create a new library" : "Close new library form";
  }, "icon-button");
  addButton.setAttribute("aria-label", "Create a new library");
  addButton.setAttribute("aria-expanded", "false");
  addButton.title = "Create a new library";

  if (libraryList.length === 0) {
    setStatus("Create your first library.", "info");
    contentElement.replaceChildren(
      createText("Your libraries belong to your NightWrapUp account."),
      addButton,
      createForm,
      createButton("Open NightWrapUp", () => {
        chrome.tabs.create({ url: FRONTEND_URL });
      }, "secondary")
    );
    return;
  }

  const select = document.createElement("select");
  select.id = "library";
  select.setAttribute("aria-label", "Select a library");
  libraryList.forEach((library) => {
    const option = document.createElement("option");
    option.value = library._id;
    option.textContent = library.name;
    select.appendChild(option);
  });

  const selectedLibrary = libraryList.find((library) => library._id === selectedLibraryId);
  const activeLibrary = selectedLibrary || libraryList[0];
  select.value = activeLibrary._id;

  select.addEventListener("change", async () => {
    try {
      await setSelectedLibraryId(select.value);
      selectedLibraryName.textContent = `Selected library: ${select.options[select.selectedIndex].text}`;
      setStatus("Library selection saved.", "success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save the selected library.", "error");
    }
  });
  const refreshButton = createButton("Reload libraries", () => init(), "secondary");
  const disconnectButton = createButton("Disconnect", async () => {
    await clearExtensionToken();
    init();
  }, "secondary");
  const selectedLibraryName = document.createElement("p");
  selectedLibraryName.className = "selected-library";
  selectedLibraryName.textContent = `Selected library: ${activeLibrary.name}`;

  contentElement.replaceChildren(
    createLabel("Library", select),
    addButton,
    createForm,
    refreshButton,
    disconnectButton,
    selectedLibraryName
  );
  setStatus("Choose the library used by the floating save button.", "info");

  if (!selectedLibrary) {
    setSelectedLibraryId(activeLibrary._id).catch((error) => {
      setStatus(error instanceof Error ? error.message : "Unable to save the selected library.", "error");
    });
  }
}

async function createNewLibrary(nameInput, descriptionInput, button) {
  const name = nameInput.value.trim();
  if (!name) {
    setStatus("Enter a library name.", "error");
    return;
  }

  button.disabled = true;
  setStatus("Creating library...", "loading");
  try {
    const library = await createLibrary(name, descriptionInput.value.trim());
    await setSelectedLibraryId(library._id);
    setStatus(`Library "${library.name}" created and selected.`, "success");
    init();
  } catch (error) {
    renderError(error);
  } finally {
    button.disabled = false;
  }
}

function renderError(error) {
  const message = error instanceof ApiError
    ? error.message
    : "Something went wrong. Please try again.";
  setStatus(message, "error");
  contentElement.replaceChildren(
    createButton("Try again", () => init()),
    createButton("Open NightWrapUp", () => {
      chrome.tabs.create({ url: FRONTEND_URL });
    }, "secondary")
  );
}

function createText(text) {
  const element = document.createElement("p");
  element.textContent = text;
  return element;
}

function createLabel(text, control) {
  const label = document.createElement("label");
  label.textContent = text;
  label.appendChild(control);
  return label;
}

function createButton(text, handler, variant = "primary") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = variant;
  button.textContent = text;
  button.addEventListener("click", handler);
  return button;
}

function setStatus(message, type) {
  statusElement.textContent = message;
  statusElement.dataset.type = type;
}
