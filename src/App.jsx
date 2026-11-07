import { useEffect, useRef, useState } from "react";

const initialNames = ["Ananya Sharma", "Rohan Mehta", "The Kapoor Family"];
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "" : "http://localhost:3001")).replace(/\/+$/, "");
const MILLIMETERS_PER_INCH = 25.4;
const PDF_POINTS_PER_INCH = 72;
const paperFormats = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  Letter: { width: 215.9, height: 279.4 },
};
const cardFormats = {
  "4x6": { width: 101.6, height: 152.4 },
  "5x7": { width: 127, height: 177.8 },
  "5x8": { width: 127, height: 203.2 },
};

function displayDimension(value, unit) {
  return unit === "in" ? Number((value / MILLIMETERS_PER_INCH).toFixed(2)) : Number(value.toFixed(1));
}

function millimeters(value, unit) {
  return unit === "in" ? value * MILLIMETERS_PER_INCH : value;
}

function validDimension(value, unit, minimum, maximum) {
  const parsed = Number(value);
  return millimeters(Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : minimum, unit);
}

async function readApiResponse(response, endpointName) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    const message = response.status === 404
      ? `${endpointName} API endpoint not found. Restart the backend so it loads the latest API routes.`
      : `${endpointName} API returned a web page instead of JSON. Check VITE_API_BASE_URL and make sure the backend is running.`;
    throw new Error(message);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`${endpointName} API returned invalid JSON. Please restart the backend and try again.`);
  }
}

function getPaperDimensions(format, orientation, customWidth, customHeight) {
  const size = format === "Custom"
    ? { width: customWidth, height: customHeight }
    : paperFormats[format];
  return orientation === "landscape"
    ? { width: size.height, height: size.width }
    : size;
}

function getPrintLayout(paper, card, margin, gap) {
  const usableWidth = paper.width - margin * 2;
  const usableHeight = paper.height - margin * 2;
  const columns = usableWidth >= card.width
    ? Math.floor((usableWidth + gap) / (card.width + gap))
    : 0;
  const rows = usableHeight >= card.height
    ? Math.floor((usableHeight + gap) / (card.height + gap))
    : 0;
  return { columns, rows, cardsPerPage: columns * rows };
}

function getCanvasSize(card, longestEdge) {
  const scale = longestEdge / Math.max(card.width, card.height);
  return {
    width: Math.max(1, Math.round(card.width * scale)),
    height: Math.max(1, Math.round(card.height * scale)),
  };
}

function drawCard(canvas, guestName) {
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);

  context.fillStyle = "#fffdf7";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#a78050";
  context.lineWidth = 2;
  context.strokeRect(25, 25, width - 50, height - 50);
  context.strokeStyle = "#d9c6a9";
  context.lineWidth = 1;
  context.strokeRect(34, 34, width - 68, height - 68);

  const drawFlourish = (x, y, flipX, flipY) => {
    context.save();
    context.translate(x, y);
    context.scale(flipX, flipY);
    context.strokeStyle = "#829174";
    context.fillStyle = "#a8b095";
    context.lineWidth = 1.6;
    context.beginPath();
    context.moveTo(0, 0);
    context.bezierCurveTo(22, 18, 8, 41, 28, 57);
    context.stroke();
    for (let index = 0; index < 4; index += 1) {
      const leafY = 9 + index * 12;
      context.beginPath();
      context.ellipse(index % 2 ? 10 : 20, leafY, 8, 3.5, index % 2 ? 0.45 : -0.45, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  };
  drawFlourish(53, 55, 1, 1);
  drawFlourish(width - 53, 55, -1, 1);
  drawFlourish(53, height - 55, 1, -1);
  drawFlourish(width - 53, height - 55, -1, -1);

  context.textAlign = "center";
  context.fillStyle = "#9c794e";
  context.font = "500 15px 'DM Sans', sans-serif";
  context.letterSpacing = "3px";
  context.fillText("WITH JOY IN OUR HEARTS", width / 2, 128);

  context.fillStyle = "#314338";
  context.font = "400 39px 'Playfair Display', Georgia, serif";
  context.letterSpacing = "0px";
  context.fillText("You are invited to", width / 2, 194);

  context.fillStyle = "#a78050";
  context.font = "500 13px 'DM Sans', sans-serif";
  context.letterSpacing = "4px";
  context.fillText("THE", width / 2, 249);

  context.fillStyle = "#314338";
  context.font = "500 34px 'Playfair Display', Georgia, serif";
  context.letterSpacing = "3px";
  context.fillText("MUNDAN CEREMONY", width / 2, 292);

  context.fillStyle = "#77836b";
  context.font = "400 18px 'Playfair Display', Georgia, serif";
  context.letterSpacing = "0px";
  context.fillText("celebrating", width / 2, 337);

  context.fillStyle = "#314338";
  context.font = "500 35px 'Playfair Display', Georgia, serif";
  context.fillText("Palak & Golu", width / 2, 387);

  context.strokeStyle = "#d9c6a9";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(175, 419);
  context.lineTo(width - 175, 419);
  context.stroke();

  context.fillStyle = "#77836b";
  context.font = "400 16px 'Playfair Display', Georgia, serif";
  context.fillText("With love, we invite", width / 2, 467);
  context.fillStyle = "#314338";
  context.font = "500 25px 'Playfair Display', Georgia, serif";
  const name = guestName || "Your guest's name";
  context.fillText(name, width / 2, 512, width - 100);

  context.fillStyle = "#77836b";
  context.font = "400 15px 'DM Sans', sans-serif";
  context.fillText("to bless our little ones on their special day", width / 2, 558);

  context.fillStyle = "#9c794e";
  context.font = "500 11px 'DM Sans', sans-serif";
  context.letterSpacing = "2px";
  context.fillText("A DAY OF BLESSINGS & JOY", width / 2, 620);
  context.letterSpacing = "0px";
}

function drawClassicInvitation(canvas, guestName) {
  const source = document.createElement("canvas");
  source.width = 600;
  source.height = 840;
  drawCard(source, guestName);

  const context = canvas.getContext("2d");
  const scale = Math.min(canvas.width / source.width, canvas.height / source.height);
  const width = source.width * scale;
  const height = source.height * scale;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#fffdf7";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
}

function openTemplateDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("petal-paper-templates", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("templates", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Couldn't open template storage."));
  });
}

async function getSavedTemplates() {
  const database = await openTemplateDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction("templates", "readonly").objectStore("templates").getAll();
    request.onsuccess = () => {
      database.close();
      resolve(request.result);
    };
    request.onerror = () => {
      database.close();
      reject(request.error || new Error("Couldn't load saved templates."));
    };
  });
}

async function saveTemplate(template) {
  const database = await openTemplateDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("templates", "readwrite");
    transaction.objectStore("templates").put(template);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error("Couldn't save this template."));
    };
  });
}

async function deleteSavedTemplate(id) {
  const database = await openTemplateDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("templates", "readwrite");
    transaction.objectStore("templates").delete(id);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error("Couldn't remove this template."));
    };
  });
}

async function drawInvitation(canvas, guestName, template, placement, isCurrent = () => true) {
  if (!template) {
    drawClassicInvitation(canvas, guestName);
    return;
  }

  const context = canvas.getContext("2d");
  const imageUrl = URL.createObjectURL(template.blob);
  try {
    const image = new Image();
    image.src = imageUrl;
    await image.decode();
    if (!isCurrent()) return;

    const width = canvas.width;
    const height = canvas.height;
    const scale = Math.min(width / image.width, height / image.height);
    const imageWidth = image.width * scale;
    const imageHeight = image.height * scale;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#fffefa";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight);

    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = placement.color;
    context.shadowColor = placement.color === "#ffffff" ? "rgba(0, 0, 0, .48)" : "rgba(255, 255, 255, .72)";
    context.shadowBlur = 5;
    context.font = `500 ${placement.fontSize}px 'Playfair Display', Georgia, serif`;
    context.fillText(guestName || "Your guest's name", width * placement.x / 100, height * placement.y / 100, width - 48);
    context.restore();
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function Icon({ name, size = 20 }) {
  const paths = {
    flower: <><path d="M12 12c-4-1-4-7 0-7s4 6 0 7Z" /><path d="M12 12c1-4 7-4 7 0s-6 4-7 0Z" /><path d="M12 12c4 1 4 7 0 7s-4-6 0-7Z" /><path d="M12 12c-1 4-7 4-7 0s6-4 7 0Z" /><circle cx="12" cy="12" r="1" /></>,
    upload: <><path d="M12 16V4m0 0L7 9m5-5 5 5" /><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></>,
    sparkle: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z" /></>,
    download: <><path d="M12 3v12m0 0 5-5m-5 5-5-5" /><path d="M5 17v3h14v-3" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    trash: <><path d="M4 7h16M10 11v6m4-6v6M5 7l1 13h12l1-13M9 7V4h6v3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function TemplateThumbnail({ blob, name }) {
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  return imageUrl ? <img src={imageUrl} alt={`${name} invitation template`} /> : null;
}

export default function App() {
  const [names, setNames] = useState(initialNames);
  const [activeIndex, setActiveIndex] = useState(0);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [useGemini, setUseGemini] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [page, setPage] = useState("create");
  const [templates, setTemplates] = useState([]);
  const [activeTemplateId, setActiveTemplateId] = useState("");
  const [templateError, setTemplateError] = useState("");
  const [templateStatus, setTemplateStatus] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templatePrompt, setTemplatePrompt] = useState("");
  const [templateApiKey, setTemplateApiKey] = useState("");
  const [templateAspectRatio, setTemplateAspectRatio] = useState("2:3");
  const [generatingTemplate, setGeneratingTemplate] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState(null);
  const [placement, setPlacement] = useState({ x: 50, y: 82, fontSize: 32, color: "#314338" });
  const [printSettings, setPrintSettings] = useState({
    paper: "A4",
    paperOrientation: "portrait",
    customPaperWidth: 210,
    customPaperHeight: 297,
    card: "5x7",
    cardWidth: 127,
    cardHeight: 177.8,
    cardOrientation: "portrait",
    unit: "mm",
    margin: 10,
    gap: 5,
  });
  const canvasRef = useRef(null);
  const inputRef = useRef(null);
  const templateInputRef = useRef(null);
  const activeName = names[activeIndex] || "";
  const activeTemplate = templates.find((template) => template.id === activeTemplateId) || null;
  const selectedCardSize = printSettings.card === "Custom"
    ? { width: printSettings.cardWidth, height: printSettings.cardHeight }
    : cardFormats[printSettings.card];
  const cardSize = printSettings.card !== "Custom" && printSettings.cardOrientation === "landscape"
    ? { width: selectedCardSize.height, height: selectedCardSize.width }
    : selectedCardSize;
  const paperSize = getPaperDimensions(
    printSettings.paper,
    printSettings.paperOrientation,
    printSettings.customPaperWidth,
    printSettings.customPaperHeight,
  );
  const printLayout = getPrintLayout(paperSize, cardSize, printSettings.margin, printSettings.gap);
  const hasValidPrintLayout = printLayout.cardsPerPage > 0;

  useEffect(() => {
    let cancelled = false;
    if (canvasRef.current) {
      const canvasSize = getCanvasSize(cardSize, 840);
      canvasRef.current.width = canvasSize.width;
      canvasRef.current.height = canvasSize.height;
      drawInvitation(canvasRef.current, activeName, activeTemplate, placement, () => !cancelled).catch((drawError) => {
        if (!cancelled) setTemplateError(`Couldn't render this template: ${drawError.message}`);
      });
    }
    return () => { cancelled = true; };
  }, [activeName, activeTemplate, placement, cardSize.width, cardSize.height]);

  useEffect(() => {
    getSavedTemplates()
      .then(setTemplates)
      .catch((loadError) => setTemplateError(`Couldn't load your template library: ${loadError.message}`));
  }, []);

  const uploadTemplate = async (selectedFile) => {
    setTemplateError("");
    setTemplateStatus("");
    if (!selectedFile) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selectedFile.type)) {
      setTemplateError("Choose a PNG, JPG, or WebP invitation image.");
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setTemplateError("This image is larger than 5 MB. Choose a smaller file.");
      return;
    }

    setSavingTemplate(true);
    try {
      const image = await createImageBitmap(selectedFile);
      image.close();
      const template = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: selectedFile.name.replace(/\.[^.]+$/, "") || "My invitation",
        blob: selectedFile,
      };
      await saveTemplate(template);
      setTemplates((current) => [...current, template]);
      setActiveTemplateId(template.id);
      setTemplateApiKey("");
      setPage("create");
      setTemplateStatus("Your invitation design is saved and ready to personalize.");
    } catch (saveError) {
      setTemplateError(`Couldn't add this template: ${saveError.message}`);
    } finally {
      setSavingTemplate(false);
      if (templateInputRef.current) templateInputRef.current.value = "";
    }
  };

  const removeTemplate = async (template) => {
    setTemplateError("");
    try {
      await deleteSavedTemplate(template.id);
      setTemplates((current) => current.filter((item) => item.id !== template.id));
      if (activeTemplateId === template.id) setActiveTemplateId("");
      setTemplateStatus(`Removed “${template.name}” from your library.`);
    } catch (deleteError) {
      setTemplateError(`Couldn't remove this template: ${deleteError.message}`);
    }
  };

  const generateTemplate = async () => {
    setTemplateError("");
    setTemplateStatus("");
    if (!templateApiKey.trim()) {
      setTemplateError("Enter your Gemini API key to create a template.");
      return;
    }
    if (!templatePrompt.trim()) {
      setTemplateError("Describe the invitation design you want to create.");
      return;
    }

    setGeneratingTemplate(true);
    setGeneratedTemplate(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/templates/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: templatePrompt.trim(),
          apiKey: templateApiKey.trim(),
          aspectRatio: templateAspectRatio,
        }),
      });
      const result = await readApiResponse(response, "Template generation");
      if (!response.ok) throw new Error(result.error || "Gemini couldn't create this design.");
      if (
        typeof result.image !== "string" ||
        !["image/png", "image/jpeg", "image/webp"].includes(result.mimeType)
      ) {
        throw new Error("The template API returned an incomplete image. Restart the backend and try again.");
      }
      const image = new Blob(
        [Uint8Array.from(atob(result.image), (character) => character.charCodeAt(0))],
        { type: result.mimeType },
      );
      if (!image.size) throw new Error("Gemini returned an empty image. Please try again.");
      setGeneratedTemplate(image);
      setTemplateStatus("Your AI invitation is ready. Preview it, then save it to your library.");
    } catch (generationError) {
      setTemplateError(generationError.message || "Gemini couldn't create this design. Please try again.");
    } finally {
      setGeneratingTemplate(false);
    }
  };

  const saveGeneratedTemplate = async (useInInvitation = false) => {
    if (!generatedTemplate) return;
    setSavingTemplate(true);
    setTemplateError("");
    try {
      const template = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: `AI design · ${templatePrompt.trim().slice(0, 40) || "Custom invitation"}`,
        blob: generatedTemplate,
      };
      await saveTemplate(template);
      setTemplates((current) => [...current, template]);
      setGeneratedTemplate(null);
      setTemplateStatus(`Saved “${template.name}” to your template library.`);
      if (useInInvitation) {
        setActiveTemplateId(template.id);
        setTemplateApiKey("");
        setPage("create");
      }
    } catch (saveError) {
      setTemplateError(`Couldn't save this design: ${saveError.message}`);
    } finally {
      setSavingTemplate(false);
    }
  };

  const setNameAt = (index, value) => {
    setNames((current) => current.map((name, itemIndex) => itemIndex === index ? value : name));
  };

  const acceptFile = (selectedFile) => {
    setError("");
    setStatus("");
    if (!selectedFile) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selectedFile.type)) {
      setError("Choose a PNG, JPG, or WebP image.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("Your image is larger than 10 MB. Choose a smaller file.");
      return;
    }
    setFile(selectedFile);
  };

  const scanImage = async () => {
    if (!file) return;
    if (useGemini && !geminiApiKey.trim()) {
      setError("Enter your Gemini API key to use Gemini, or turn it off to scan locally.");
      return;
    }
    setScanning(true);
    setError("");
    setStatus(useGemini
      ? "Sending a resized image to Gemini to read the handwriting…"
      : "Enhancing the image and trying several handwriting-friendly scans… this can take a little while.");
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("useGemini", useGemini ? "true" : "false");
      if (useGemini) formData.append("geminiApiKey", geminiApiKey.trim());
      const response = await fetch(`${API_BASE_URL}/api/scan`, { method: "POST", body: formData });
      const result = await readApiResponse(response, "Guest-list scanning");
      if (!response.ok) throw new Error(result.error || "Couldn't read this image.");
      if (result.names.length) {
        setNames(result.names);
        setActiveIndex(0);
        const method = result.parser === "gemini" ? "Gemini" : "local OCR";
        const fallbackNotice = result.fallback
          ? ` Gemini was unavailable; local OCR was used instead. ${result.fallbackReason || ""}`
          : "";
        setStatus(`${result.names.length} ${result.names.length === 1 ? "name" : "names"} found with ${method}.${fallbackNotice} Give them a quick check before printing.`);
      } else {
        const fallbackNotice = result.fallback
          ? `Gemini was unavailable; local OCR was tried. ${result.fallbackReason || ""} `
          : "";
        setStatus(`${fallbackNotice}${result.message || "No names found. You can enter them below."}`);
      }
    } catch (scanError) {
      setError(scanError.message || "Couldn't read this image. You can enter names manually.");
      setStatus("");
    } finally {
      setScanning(false);
    }
  };

  const addName = () => {
    setNames((current) => [...current, ""]);
    setActiveIndex(names.length);
  };

  const removeName = (index) => {
    setNames((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setActiveIndex((current) => current > index ? current - 1 : Math.min(current, Math.max(0, names.length - 2)));
  };

  const exportPdf = async () => {
    const printableNames = names.map((name) => name.trim()).filter(Boolean);
    if (!printableNames.length) {
      setError("Add at least one guest name before making your PDF.");
      return;
    }
    if (!hasValidPrintLayout) {
      setError("These card dimensions won't fit on the selected paper with the current margins. Choose a larger paper or smaller card.");
      return;
    }
    setExporting(true);
    setError("");
    try {
      const { PDFDocument } = await import("pdf-lib");
      await document.fonts.ready;
      const pdf = await PDFDocument.create();
      const exportCanvas = document.createElement("canvas");
      const canvasSize = getCanvasSize(cardSize, 1600);
      exportCanvas.width = canvasSize.width;
      exportCanvas.height = canvasSize.height;
      const pointsPerMillimeter = PDF_POINTS_PER_INCH / MILLIMETERS_PER_INCH;
      const pageWidth = paperSize.width * pointsPerMillimeter;
      const pageHeight = paperSize.height * pointsPerMillimeter;
      const cardWidth = cardSize.width * pointsPerMillimeter;
      const cardHeight = cardSize.height * pointsPerMillimeter;
      const gap = printSettings.gap * pointsPerMillimeter;
      const gridWidth = printLayout.columns * cardWidth + (printLayout.columns - 1) * gap;
      const gridHeight = printLayout.rows * cardHeight + (printLayout.rows - 1) * gap;
      const left = (pageWidth - gridWidth) / 2;
      const top = (pageHeight - gridHeight) / 2;

      for (let start = 0; start < printableNames.length; start += printLayout.cardsPerPage) {
        const page = pdf.addPage([pageWidth, pageHeight]);
        for (let offset = 0; offset < printLayout.cardsPerPage && start + offset < printableNames.length; offset += 1) {
          await drawInvitation(exportCanvas, printableNames[start + offset], activeTemplate, placement);
          const image = await pdf.embedPng(exportCanvas.toDataURL("image/png"));
          const column = offset % printLayout.columns;
          const row = Math.floor(offset / printLayout.columns);
          page.drawImage(image, {
            x: left + column * (cardWidth + gap),
            y: pageHeight - top - row * (cardHeight + gap) - cardHeight,
            width: cardWidth,
            height: cardHeight,
          });
        }
      }

      const bytes = await pdf.save();
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "invitation-cards-print.pdf";
      link.click();
      URL.revokeObjectURL(url);
      setStatus(`Your ${printableNames.length}-card print PDF is ready.`);
    } catch (exportError) {
      setError(`PDF export failed: ${exportError.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Petal and Paper home">
          <span className="brand-mark"><Icon name="flower" size={22} /></span>
          <span>petal <i>&</i> paper</span>
        </a>
        <div className="topbar-note"><span className="status-dot" /> YOUR LITTLE MOMENTS, BEAUTIFULLY MADE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={page === "create" ? "active" : ""} onClick={() => { setTemplateApiKey(""); setPage("create"); }}>Create invitations</button>
          <button className={page === "templates" ? "active" : ""} onClick={() => { setTemplateError(""); setPage("templates"); }}>My templates <span>{templates.length}</span></button>
          <button className={page === "print" ? "active" : ""} onClick={() => { setTemplateApiKey(""); setError(""); setPage("print"); }}>Print setup</button>
        </nav>
        <button className="header-button" onClick={exportPdf} disabled={page === "templates" || exporting || !names.some((name) => name.trim()) || !hasValidPrintLayout}>
          <Icon name="download" size={17} /> {exporting ? "Making your PDF…" : page === "print" ? "Print PDF" : "Download cards"}
        </button>
      </header>

      {page === "templates" ? (
        <main className="templates-page">
          <section className="intro">
            <div className="eyebrow"><span /> YOUR DESIGNS, YOUR WAY</div>
            <h1>A card that feels <em>like you.</em></h1>
            <p>Upload a card design you love, then add each guest’s name and print your invitations.</p>
          </section>
          <section className="template-library">
            <div className="library-heading">
              <div><div className="section-kicker">INVITATION DESIGN</div><h2>Your template library</h2></div>
              <span>{templates.length} {templates.length === 1 ? "TEMPLATE" : "TEMPLATES"}</span>
            </div>
            <section className="ai-template-maker" aria-labelledby="ai-template-heading">
              <div className="ai-maker-heading">
                <span className="ai-maker-icon"><Icon name="sparkle" size={19} /></span>
                <div><div className="section-kicker">GEMINI IMAGE GENERATION</div><h3 id="ai-template-heading">Create a design with AI</h3></div>
              </div>
              <p>Describe the invitation you imagine. Gemini will create a card background and leave space for each guest’s name.</p>
              <label className="ai-prompt-label" htmlFor="template-design-prompt">What should your invitation look like?</label>
              <textarea
                id="template-design-prompt"
                value={templatePrompt}
                onChange={(event) => setTemplatePrompt(event.target.value)}
                placeholder="For example: A grand ivory and emerald Indian wedding invitation with delicate gold floral borders and a calm space for the guest name."
                maxLength={1200}
                rows={4}
                disabled={generatingTemplate}
              />
              <div className="ai-prompt-footer"><span>Describe colors, occasion, style, and decorations. Text is left out so the app can personalize each card.</span><span>{templatePrompt.length}/1200</span></div>
              <div className="ai-maker-controls">
                <label>Card shape
                  <select value={templateAspectRatio} onChange={(event) => setTemplateAspectRatio(event.target.value)} disabled={generatingTemplate}>
                    <option value="2:3">Portrait · 2:3</option>
                    <option value="3:4">Portrait · 3:4</option>
                  </select>
                </label>
                <label className="ai-key-field">Your Gemini API key
                  <input
                    type="password"
                    value={templateApiKey}
                    onChange={(event) => setTemplateApiKey(event.target.value)}
                    placeholder="Paste your key from Google AI Studio"
                    autoComplete="off"
                    spellCheck="false"
                    maxLength={1024}
                    disabled={generatingTemplate}
                  />
                </label>
              </div>
              <div className="ai-key-note">
                <span>Your key is sent to Gemini for generation only and is not saved by this app.</span>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Get a Gemini API key ↗</a>
              </div>
              <div className="ai-terms-note">Gemini image generation uses your Google AI Studio account. Model availability, free quota, and any charges depend on Google’s current terms and your account. Google may process your prompt; avoid including personal or sensitive information.</div>
              <button className="generate-template-button" onClick={generateTemplate} disabled={generatingTemplate || !templatePrompt.trim() || !templateApiKey.trim()}>
                <Icon name="sparkle" size={17} /> {generatingTemplate ? "Creating your invitation…" : "Generate invitation design"}
              </button>
              {templateError && <div className="notice error" role="alert">{templateError}</div>}
              {templateStatus && <div className="notice success" role="status"><Icon name="check" size={16} /><span>{templateStatus}</span></div>}
              {generatedTemplate && (
                <div className="generated-template">
                  <div className="generated-template-top"><strong>Your new design</strong><span>Preview before saving</span></div>
                  <div className="generated-template-image"><TemplateThumbnail blob={generatedTemplate} name="AI-generated invitation" /></div>
                  <div className="generated-template-actions">
                    <button className="template-use" onClick={() => saveGeneratedTemplate(false)} disabled={savingTemplate}>{savingTemplate ? "Saving…" : "Save to my templates"}</button>
                    <button className="template-use use-generated" onClick={() => saveGeneratedTemplate(true)} disabled={savingTemplate}>{savingTemplate ? "Saving…" : "Use this invitation"}</button>
                  </div>
                </div>
              )}
            </section>
            <button className="template-upload" onClick={() => templateInputRef.current?.click()} disabled={savingTemplate}>
              <span className="template-upload-icon"><Icon name="upload" size={23} /></span>
              <strong>{savingTemplate ? "Saving your design…" : "Upload a custom template"}</strong>
              <span>Choose an invitation image from your device</span>
              <small>PNG, JPG, or WebP · up to 5 MB</small>
            </button>
            <input ref={templateInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => uploadTemplate(event.target.files[0])} />
            <div className="template-grid">
              <article className={`template-card ${!activeTemplateId ? "selected" : ""}`}>
                <div className="template-thumb built-in-thumb"><Icon name="flower" size={30} /><span>Petal & Paper</span></div>
                <div className="template-card-info"><strong>Classic invitation</strong><span>Built-in design</span></div>
                <button className="template-use" onClick={() => { setActiveTemplateId(""); setPage("create"); }}>Use this design</button>
              </article>
              {templates.map((template) => (
                <article className={`template-card ${activeTemplateId === template.id ? "selected" : ""}`} key={template.id}>
                  <div className="template-thumb">
                    <TemplateThumbnail blob={template.blob} name={template.name} />
                    {activeTemplateId === template.id && <span className="selected-badge"><Icon name="check" size={13} /> SELECTED</span>}
                  </div>
                  <div className="template-card-info"><strong title={template.name}>{template.name}</strong><span>Your uploaded design</span></div>
                  <div className="template-card-actions">
                    <button className="template-use" onClick={() => { setActiveTemplateId(template.id); setTemplateStatus(""); setTemplateApiKey(""); setPage("create"); }}>Use this design</button>
                    <button className="template-remove" onClick={() => removeTemplate(template)} aria-label={`Remove ${template.name}`}>Remove</button>
                  </div>
                </article>
              ))}
            </div>
            {!templates.length && <p className="empty-templates">Your uploaded designs will appear here. Templates stay on this device and are not uploaded to a server.</p>}
            <div className="library-tip"><Icon name="sparkle" size={16} /><span>For the best result, upload a finished card design with a clear space for each guest’s name. You can adjust the name’s position and style in the invitation preview.</span></div>
          </section>
        </main>
      ) : page === "print" ? (
        <main className="print-setup-page">
          <section className="intro">
            <div className="eyebrow"><span /> PRINTING, MADE SIMPLE</div>
            <h1>A perfect fit, <em>every time.</em></h1>
            <p>Choose your card size and paper. We’ll arrange your invitations to make printing and trimming easy.</p>
          </section>
          <section className="print-setup">
            <div className="print-settings-panel">
              <div className="library-heading">
                <div><div className="section-kicker">PRINT SETTINGS</div><h2>Set up your print sheet</h2></div>
              </div>
              <div className="settings-group">
                <h3>Paper sheet</h3>
                <div className="settings-fields">
                  <label>Paper size
                    <select value={printSettings.paper} onChange={(event) => setPrintSettings((current) => ({ ...current, paper: event.target.value }))}>
                      {Object.keys(paperFormats).map((format) => <option key={format} value={format}>{format}{format === "A4" ? " · 210 × 297 mm" : format === "A5" ? " · 148 × 210 mm" : " · 8.5 × 11 in"}</option>)}
                      <option value="Custom">Custom paper</option>
                    </select>
                  </label>
                  <label>Orientation
                    <select value={printSettings.paperOrientation} onChange={(event) => setPrintSettings((current) => ({ ...current, paperOrientation: event.target.value }))}>
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </label>
                  {printSettings.paper === "Custom" && (
                    <>
                      <label>Paper width ({printSettings.unit})
                        <input type="number" min={displayDimension(50, printSettings.unit)} max={displayDimension(1000, printSettings.unit)} step={printSettings.unit === "in" ? "0.1" : "1"} value={displayDimension(printSettings.customPaperWidth, printSettings.unit)} onChange={(event) => setPrintSettings((current) => ({ ...current, customPaperWidth: validDimension(event.target.value, current.unit, displayDimension(50, current.unit), displayDimension(1000, current.unit)) }))} />
                      </label>
                      <label>Paper height ({printSettings.unit})
                        <input type="number" min={displayDimension(50, printSettings.unit)} max={displayDimension(1000, printSettings.unit)} step={printSettings.unit === "in" ? "0.1" : "1"} value={displayDimension(printSettings.customPaperHeight, printSettings.unit)} onChange={(event) => setPrintSettings((current) => ({ ...current, customPaperHeight: validDimension(event.target.value, current.unit, displayDimension(50, current.unit), displayDimension(1000, current.unit)) }))} />
                      </label>
                    </>
                  )}
                </div>
              </div>
              <div className="settings-group">
                <h3>Invitation card</h3>
                <div className="settings-fields">
                  <label>Card size
                    <select value={printSettings.card} onChange={(event) => {
                      const selected = event.target.value;
                      setPrintSettings((current) => ({
                        ...current,
                        card: selected,
                        ...(selected === "Custom" ? {} : { cardWidth: cardFormats[selected].width, cardHeight: cardFormats[selected].height }),
                      }));
                    }}>
                      <option value="4x6">4 × 6 in · 102 × 152 mm</option>
                      <option value="5x7">5 × 7 in · 127 × 178 mm</option>
                      <option value="5x8">5 × 8 in · 127 × 203 mm</option>
                      <option value="Custom">Custom card</option>
                    </select>
                  </label>
                  <label>Units
                    <select value={printSettings.unit} onChange={(event) => setPrintSettings((current) => ({ ...current, unit: event.target.value }))}>
                      <option value="mm">Millimeters (mm)</option>
                      <option value="in">Inches (in)</option>
                    </select>
                  </label>
                  <label>Card orientation
                    <select value={printSettings.cardOrientation} disabled={printSettings.card === "Custom"} onChange={(event) => setPrintSettings((current) => ({ ...current, cardOrientation: event.target.value }))}>
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </label>
                  {printSettings.card === "Custom" && (
                    <>
                      <label>Card width ({printSettings.unit})
                        <input type="number" min={displayDimension(25, printSettings.unit)} max={displayDimension(500, printSettings.unit)} step={printSettings.unit === "in" ? "0.1" : "1"} value={displayDimension(printSettings.cardWidth, printSettings.unit)} onChange={(event) => setPrintSettings((current) => ({ ...current, cardWidth: validDimension(event.target.value, current.unit, displayDimension(25, current.unit), displayDimension(500, current.unit)) }))} />
                      </label>
                      <label>Card height ({printSettings.unit})
                        <input type="number" min={displayDimension(25, printSettings.unit)} max={displayDimension(500, printSettings.unit)} step={printSettings.unit === "in" ? "0.1" : "1"} value={displayDimension(printSettings.cardHeight, printSettings.unit)} onChange={(event) => setPrintSettings((current) => ({ ...current, cardHeight: validDimension(event.target.value, current.unit, displayDimension(25, current.unit), displayDimension(500, current.unit)) }))} />
                      </label>
                    </>
                  )}
                </div>
              </div>
              <div className="settings-group finishing-settings">
                <h3>Cutting space</h3>
                <div className="settings-fields">
                  <label>Edge margin ({printSettings.unit})
                    <input type="number" min="0" max={displayDimension(50, printSettings.unit)} step={printSettings.unit === "in" ? "0.1" : "1"} value={displayDimension(printSettings.margin, printSettings.unit)} onChange={(event) => setPrintSettings((current) => ({ ...current, margin: validDimension(event.target.value, current.unit, 0, displayDimension(50, current.unit)) }))} />
                  </label>
                  <label>Space between cards ({printSettings.unit})
                    <input type="number" min="0" max={displayDimension(50, printSettings.unit)} step={printSettings.unit === "in" ? "0.1" : "1"} value={displayDimension(printSettings.gap, printSettings.unit)} onChange={(event) => setPrintSettings((current) => ({ ...current, gap: validDimension(event.target.value, current.unit, 0, displayDimension(50, current.unit)) }))} />
                  </label>
                </div>
                <p>Margins and gaps are kept clear for your printer and for cutting.</p>
              </div>
              {!hasValidPrintLayout && <div className="notice error" role="alert">This card won’t fit on the selected paper with the current margins. Choose smaller dimensions or a larger sheet.</div>}
              {error && <div className="notice error" role="alert">{error}</div>}
              {status && <div className="notice success" role="status">{status}</div>}
              <button className="print-export-button" onClick={exportPdf} disabled={exporting || !names.some((name) => name.trim()) || !hasValidPrintLayout}>
                <Icon name="download" size={17} /> {exporting ? "Preparing your print PDF…" : "Download print-ready PDF"}
              </button>
              <p className="print-instructions">In your printer dialog, choose the same paper size and select <strong>Actual size</strong> or <strong>100%</strong> scaling.</p>
            </div>
            <aside className="print-preview-panel">
              <div className="preview-heading">
                <div><div className="section-kicker">SHEET PREVIEW</div><h2>Your print layout</h2></div>
                <span className="live-tag"><span /> LIVE</span>
              </div>
              <div className="sheet-preview-wrap">
                <div className="sheet-preview" style={{ aspectRatio: `${paperSize.width} / ${paperSize.height}` }}>
                  {hasValidPrintLayout && (
                    <div className="sheet-cards" style={{
                      width: `${(printLayout.columns * cardSize.width + (printLayout.columns - 1) * printSettings.gap) / paperSize.width * 100}%`,
                      height: `${(printLayout.rows * cardSize.height + (printLayout.rows - 1) * printSettings.gap) / paperSize.height * 100}%`,
                      gridTemplateColumns: `repeat(${printLayout.columns}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${printLayout.rows}, minmax(0, 1fr))`,
                      gap: `${printSettings.gap / paperSize.width * 100}%`,
                    }}>
                      {Array.from({ length: Math.min(printLayout.cardsPerPage, 60) }, (_, index) => (
                        <div className="sheet-card" key={index}><span>{index < names.length ? names[index] || "Guest name" : "Guest name"}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="sheet-summary">
                <div><span>Paper</span><strong>{printSettings.paper === "Custom" ? "Custom" : printSettings.paper} · {printSettings.paperOrientation}</strong></div>
                <div><span>Card size</span><strong>{displayDimension(cardSize.width, printSettings.unit)} × {displayDimension(cardSize.height, printSettings.unit)} {printSettings.unit}</strong></div>
                <div><span>Cards per sheet</span><strong>{hasValidPrintLayout ? printLayout.cardsPerPage : "Does not fit"}</strong></div>
                <div><span>Guests</span><strong>{names.filter((name) => name.trim()).length} cards · {hasValidPrintLayout ? Math.ceil(names.filter((name) => name.trim()).length / printLayout.cardsPerPage) : "—"} {hasValidPrintLayout && Math.ceil(names.filter((name) => name.trim()).length / printLayout.cardsPerPage) === 1 ? "sheet" : "sheets"}</strong></div>
              </div>
              <p className="print-preview-note">Cards are centered on each sheet. Final PDF pages use your chosen paper and card dimensions.</p>
            </aside>
          </section>
        </main>
      ) : <main>
        <section className="intro">
          <div className="eyebrow"><span /> THE INVITATION STUDIO</div>
          <h1>A little love, <em>for everyone.</em></h1>
          <p>Turn your guest list into something they’ll want to keep. Scan, personalize, and print in just a few moments.</p>
        </section>

        <div className="steps" aria-label="Invitation creation steps">
          <div className="step active"><span>01</span> ADD YOUR GUESTS</div>
          <span className="step-line" />
          <div className={`step ${names.some((name) => name.trim()) ? "active" : ""}`}><span>02</span> PREVIEW YOUR CARD</div>
          <span className="step-line" />
          <div className="step"><span>03</span> PRINT & SHARE</div>
        </div>

        <section className="workspace">
          <div className="guest-panel">
            <div className="panel-heading">
              <div>
                <div className="section-kicker">FIRST THINGS FIRST</div>
                <h2>Your lovely guests</h2>
              </div>
              <span className="count-pill">{names.filter((name) => name.trim()).length} {names.filter((name) => name.trim()).length === 1 ? "GUEST" : "GUESTS"}</span>
            </div>
            {templateError && <div className="notice error" role="alert">{templateError}</div>}
            {templateStatus && <div className="notice success" role="status"><Icon name="check" size={16} /><span>{templateStatus}</span></div>}
            <p className="panel-copy">Start with a handwritten list or add names one by one. You can edit anything we read.</p>

            <button
              className={`upload-zone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); acceptFile(event.dataTransfer.files[0]); }}
            >
              <span className="upload-icon"><Icon name="upload" size={21} /></span>
              <span className="upload-text">
                <strong>{file ? file.name : "Drop your guest list here"}</strong>
                <span>{file ? "Ready to read · Choose another image" : "or click to choose an image"}</span>
              </span>
              <span className="browse-link">{file ? "CHANGE" : "BROWSE"}</span>
              <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => acceptFile(event.target.files[0])} />
            </button>
            <div className="upload-hint">PNG, JPG or WebP <span>·</span> up to 10 MB</div>
            <div className="gemini-choice">
              <label className="gemini-toggle">
                <input
                  type="checkbox"
                  checked={useGemini}
                  onChange={(event) => {
                    setUseGemini(event.target.checked);
                    setError("");
                    if (!event.target.checked) setGeminiApiKey("");
                  }}
                  disabled={scanning}
                />
                <span>
                  <strong>Use your own Gemini API key</strong>
                  <small>Optional. Gemini and Google’s usage terms apply to the image you submit. Free-tier content may be used to improve Google products.</small>
                </span>
              </label>
              {useGemini && (
                <div className="gemini-key-entry">
                  <label htmlFor="gemini-api-key">Your Gemini API key</label>
                  <input
                    id="gemini-api-key"
                    type="password"
                    value={geminiApiKey}
                    onChange={(event) => setGeminiApiKey(event.target.value)}
                    placeholder="Paste your API key"
                    autoComplete="off"
                    spellCheck="false"
                    maxLength={1024}
                    disabled={scanning}
                  />
                  <div className="gemini-key-help">
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Get a Gemini API key ↗</a>
                    <span>Used for this scan only; never saved by this app.</span>
                  </div>
                </div>
              )}
            </div>
            {file && <button className="scan-button" onClick={scanImage} disabled={scanning}>
              <Icon name="sparkle" size={17} /> {scanning ? "Reading your handwriting…" : "Read handwritten names"}
            </button>}

            {status && <div className="notice success"><Icon name="check" size={16} /><span>{status}</span></div>}
            {error && <div className="notice error" role="alert">{error}</div>}

            <div className="list-heading">
              <span>YOUR GUEST LIST</span>
              <span>EDIT ANY NAME</span>
            </div>
            <div className="guest-list">
              {names.map((name, index) => (
                <div className={`guest-row ${activeIndex === index ? "selected" : ""}`} key={index}>
                  <button className="guest-number" onClick={() => setActiveIndex(index)} aria-label={`Preview card for guest ${index + 1}`}>{String(index + 1).padStart(2, "0")}</button>
                  <input
                    aria-label={`Guest ${index + 1} name`}
                    value={name}
                    onFocus={() => setActiveIndex(index)}
                    onChange={(event) => setNameAt(index, event.target.value)}
                    placeholder="Type a guest name"
                  />
                  <button className="remove-button" onClick={() => removeName(index)} aria-label={`Remove guest ${index + 1}`}><Icon name="trash" size={16} /></button>
                </div>
              ))}
            </div>
            <button className="add-name" onClick={addName}><Icon name="plus" size={16} /> Add another guest</button>
            <div className="privacy-note"><span className="lock-icon">✳</span> {useGemini ? "Your key stays in this page's memory while Gemini is enabled; this app never saves it." : "Local OCR only. This app does not save your image or guest names."}</div>
          </div>

          <div className="preview-panel">
            <div className="preview-heading">
              <div>
                <div className="section-kicker">MADE JUST FOR THEM</div>
                <h2>A card with their name on it</h2>
              </div>
              <span className="live-tag"><span /> LIVE PREVIEW</span>
            </div>
            <div className="canvas-stage">
              <div className="canvas-wrap">
                <canvas ref={canvasRef} width="600" height="840" aria-label={`Invitation preview for ${activeName || "guest"}`} />
              </div>
              <div className="preview-caption"><span><Icon name="sparkle" size={15} /> A little keepsake for</span><strong>{activeName || "your guest"}</strong></div>
            </div>
            {activeTemplate && (
              <div className="name-controls">
                <div className="name-controls-heading"><strong>Personalize your template</strong><span>{activeTemplate.name}</span></div>
                <label>Name position <span>Vertical</span><input type="range" min="10" max="95" value={placement.y} onChange={(event) => setPlacement((current) => ({ ...current, y: Number(event.target.value) }))} /></label>
                <label className="horizontal-control"><span>Left</span><input aria-label="Name horizontal position" type="range" min="10" max="90" value={placement.x} onChange={(event) => setPlacement((current) => ({ ...current, x: Number(event.target.value) }))} /><span>Right</span></label>
                <div className="name-style-controls">
                  <label>Text size <select value={placement.fontSize} onChange={(event) => setPlacement((current) => ({ ...current, fontSize: Number(event.target.value) }))}><option value="24">Small</option><option value="32">Medium</option><option value="40">Large</option><option value="48">Extra large</option></select></label>
                  <label>Text color <input aria-label="Guest name text color" type="color" value={placement.color} onChange={(event) => setPlacement((current) => ({ ...current, color: event.target.value }))} /></label>
                </div>
              </div>
            )}
            <div className="preview-footer">
              <span>One name, one special card.</span>
              <div className="preview-arrows">
                <button onClick={() => setActiveIndex((activeIndex - 1 + names.length) % names.length)} disabled={!names.length} aria-label="Previous guest">←</button>
                <span>{names.length ? `${String(activeIndex + 1).padStart(2, "0")} / ${String(names.length).padStart(2, "0")}` : "00 / 00"}</span>
                <button onClick={() => setActiveIndex((activeIndex + 1) % names.length)} disabled={!names.length} aria-label="Next guest">→</button>
              </div>
            </div>
          </div>
        </section>

        <section className="print-strip">
          <div className="print-mark"><Icon name="flower" size={22} /></div>
          <div className="print-copy"><strong>Make it print-ready.</strong><span>Choose your card size and paper layout before downloading your PDF.</span></div>
          <button onClick={() => { setError(""); setPage("print"); }}>
            Set up printing <Icon name="download" size={17} />
          </button>
          <span className="print-corner">✳</span>
        </section>
        <footer><span>MADE WITH CARE, FOR MOMENTS THAT MATTER</span><span>PALAK & GOLU’S MUNDAN CEREMONY</span></footer>
      </main>}
    </div>
  );
}
