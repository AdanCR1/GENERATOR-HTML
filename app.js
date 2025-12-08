// app.js (Versión corregida y organizada)
// =====================================================================
// 1. FORMATO DE TEXTO Y ESTADO GLOBAL
// =====================================================================

const TEMPLATE_INFO = {
    'template1': { 
        name: 'Diseño Académico Clásico', 
        html: '/templates/template.html', 
        css: '/templates/template1.css' 
    },
    'template2': { 
        name: 'Diseño Académico moderno', 
        html: '/templates/template.html', 
        css: '/templates/template2.css' 
    },
    'template3': { 
        name: 'Diseño moderno', 
        html: '/templates/template.html', 
        css: '/templates/template3.css' 
    },
    'template4': { 
        name: 'Diseño minimalista', 
        html: '/templates/template.html', 
        css: '/templates/template4.css' 
    },
    'template5': { 
        name: 'Diseño biofílico', 
        html: '/templates/template.html', 
        css: '/templates/template5.css' 
    },
};

let currentTemplateHTML = '';
let currentTemplateCSS = '';
let isEditingMode = true;
let lastFocusedElement = null;
let zoomLevel = 1.0;
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;

// Script de cambio de tema
const THEME_SCRIPT_STRING = `
document.addEventListener("DOMContentLoaded", () => {
    const btnClaro = document.getElementById("theme_claro");
    const btnOscuro = document.getElementById("theme_oscuro");
    
    const toggleTheme = (isDark) => {
        if (isDark) {
            document.body.classList.add("dark-mode");
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove("dark-mode");
            localStorage.setItem('theme', 'light');
        }
    };

    if (localStorage.getItem('theme') === 'dark') {
        toggleTheme(true);
    }

    btnOscuro.addEventListener("click", () => toggleTheme(true));
    btnClaro.addEventListener("click", () => toggleTheme(false));
});
`;

// =====================================================================
// 2. FUNCIONES DE FORMATO MEJORADAS
// =====================================================================

// Función para guardar el último elemento enfocado
function saveFocus() {
    const activeElement = document.activeElement;
    if (activeElement && activeElement.hasAttribute('contenteditable')) {
        lastFocusedElement = activeElement;
    }
}

// Función para restaurar el foco
function restoreFocus() {
    if (lastFocusedElement) {
        lastFocusedElement.focus();
    }
}

// Función para actualizar el estado visual de los botones
function updateToolbarButtons() {
    // Limpiar todos los botones activos primero
    document.querySelectorAll('.toolbar button').forEach(btn => {
        btn.classList.remove('active');
    });

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    if (!range) return;

    // Importante: asegurarnos de que la selección está dentro de un contenteditable o execCommand funcione
    try {
        // Estos comandos funcionan bien con queryCommandState
        const commands = [
            { cmd: 'bold', selector: 'button[data-command="bold"]' },
            { cmd: 'italic', selector: 'button[data-command="italic"]' },
            { cmd: 'underline', selector: 'button[data-command="underline"]' },
            { cmd: 'superscript', selector: '#btnSuperscript' },
            { cmd: 'subscript', selector: '#btnSubscript' },
            { cmd: 'insertUnorderedList', selector: 'button[data-command="insertUnorderedList"]' },
        ];

        commands.forEach(({ cmd, selector }) => {
            if (document.queryCommandState(cmd)) {
                const btn = document.querySelector(selector);
                if (btn) btn.classList.add('active');
            }
        });

        // Enlaces: queryCommandState no existe para createLink, usamos selección
        if (selection.rangeCount > 0) {
            const parentAnchor = range.commonAncestorContainer;
            const anchor = parentAnchor.nodeType === 3 
                ? parentAnchor.parentNode.closest('a')
                : parentAnchor.closest('a');
                
            if (anchor) {
                const linkBtn = document.querySelector('button[data-command="createLink"]');
                if (linkBtn) linkBtn.classList.add('active');
            }
        }

        // Encabezados (h1, h2, h3, p) - usando queryCommandValue o nodo ancestro
        const heading = document.queryCommandValue('formatBlock').toLowerCase().replace(/[^a-z0-9]/g, '');
        const validHeadings = ['h1', 'h2', 'h3', 'p'];
        
        if (validHeadings.includes(heading)) {
            const btn = document.querySelector(`button[data-value="${heading}"]`);
            if (btn) btn.classList.add('active');
        }

        // Alternativa más robusta para encabezados (por si queryCommandValue falla)
        const container = range.commonAncestorContainer;
        const element = container.nodeType === 3 ? container.parentNode : container;
        const block = element.closest ? element.closest('h1,h2,h3,p') : null;
        
        if (block) {
            const tag = block.tagName.toLowerCase();
            const btn = document.querySelector(`button[data-value="${tag}"]`);
            if (btn) btn.classList.add('active');
        }

    } catch (err) {
        console.warn('Error actualizando toolbar:', err);
    }
}

// Función principal de formato
function formatDoc(command, value = null) {
    saveFocus();
    
    try {
        switch(command) {
            case 'superscript':
                document.execCommand('superscript', false, null);
                break;
            case 'subscript':
                document.execCommand('subscript', false, null);
                break;
            case 'formatBlock':
                if (value) {
                    document.execCommand('formatBlock', false, value);
                }
                break;
            case 'createLink':
                const url = prompt('Introduce el enlace (URL):', 'https://');
                if (url) {
                    document.execCommand('createLink', false, url);
                }
                break;
            case 'insertImage':
                insertImage();
                break;
            default:
                document.execCommand(command, false, value);
        }
    } catch (error) {
        console.error('Error en formatDoc:', error);
    }
    
    restoreFocus();
}

// Función para insertar imagen desde el ordenador
function insertImage() {
    saveFocus();
    
    // Crear input de archivo
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const imageUrl = event.target.result;
            
            // Insertar la imagen en el contenido editable
            const activeElement = lastFocusedElement || document.activeElement;
            if (activeElement && activeElement.hasAttribute('contenteditable')) {
                // Guardar selección actual
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                
                // Crear elemento imagen
                const img = document.createElement('img');
                img.src = imageUrl;
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.alt = 'Imagen insertada';
                
                // Insertar imagen
                range.insertNode(img);
                
                // Mover cursor después de la imagen
                range.setStartAfter(img);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                // Si no hay elemento enfocado, pedir al usuario
                const containerId = prompt(
                    '¿En qué sección quieres insertar la imagen?\n' +
                    '1. article-body (Cuerpo del artículo)\n' +
                    '2. article-references (Referencias)\n' +
                    'Escribe el número:'
                );
                
                let targetElement;
                if (containerId === '1') {
                    targetElement = document.getElementById('article-body');
                } else if (containerId === '2') {
                    targetElement = document.getElementById('article-references');
                } else {
                    targetElement = document.getElementById('article-body');
                }
                
                if (targetElement) {
                    const img = document.createElement('img');
                    img.src = imageUrl;
                    img.style.maxWidth = '100%';
                    img.style.height = 'auto';
                    img.alt = 'Imagen insertada';
                    
                    targetElement.appendChild(img);
                    targetElement.appendChild(document.createElement('p'));
                }
            }
        };
        
        reader.readAsDataURL(file);
    };
    
    input.click();
}

// =====================================================================
// 3. CARGA DE PLANTILLAS
// =====================================================================

async function loadTemplate(templateId, forcePreviewUpdate = false) {
    const info = TEMPLATE_INFO[templateId];
    if (!info) {
        console.error('Plantilla no encontrada:', templateId);
        return;
    }

    try {
        // Cargar HTML
        const responseHTML = await fetch(info.html);
        currentTemplateHTML = await responseHTML.text();

        // Cargar CSS
        const responseCSS = await fetch(info.css);
        currentTemplateCSS = await responseCSS.text();

        console.log(`Plantilla "${info.name}" cargada.`);
        document.getElementById('appTitle').textContent = `Generador de Artículos Científicos - ${info.name}`;
        
        // Si estamos en modo previsualización y se cargó una nueva plantilla,
        // actualizar automáticamente el iframe
        if (!isEditingMode && forcePreviewUpdate) {
            updatePreviewIframe();
        }
        
    } catch (error) {
        console.error('Error al cargar la plantilla:', error);
        alert('Hubo un error al cargar la plantilla seleccionada.');
    }
}

// Función para actualizar el iframe de previsualización
function updatePreviewIframe() {
    if (!currentTemplateHTML || isEditingMode) {
        return; // No actualizar si estamos en modo edición o no hay plantilla
    }
    
    console.log('Actualizando previsualización con nueva plantilla...');
    
    const finalHTML = generateFinalHTML(false);
    const blob = new Blob([finalHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const iframe = document.getElementById('previewIframe');
    
    // Guardar la posición de scroll actual
    const previousScrollTop = iframe.contentDocument?.documentElement?.scrollTop || 0;
    
    iframe.src = url;
    
    iframe.onload = function() {
        // Restaurar la posición de scroll
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDoc && iframeDoc.documentElement) {
                iframeDoc.documentElement.scrollTop = previousScrollTop;
            }
        } catch (e) {
            console.log('No se pudo restaurar la posición del scroll');
        }
        
        // Reaplicar el zoom
        applyZoomToPreview();
    };
}

// =====================================================================
// 4. GENERACIÓN DE HTML FINAL
// =====================================================================

function generateFinalHTML(exportMode = false) {
    // Capturar contenido de áreas editables
    const title = document.getElementById('article-title').innerHTML.trim();
    const titleEn = document.getElementById('article-title-en').innerHTML.trim();
    const journalInfo = document.getElementById('meta-journal-info').innerHTML.trim();
    const doiText = document.getElementById('meta-doi').textContent.trim();
    const editorial = document.getElementById('meta-editorial').innerHTML.trim();
    const authorList = document.getElementById('author-list').innerHTML.trim();
    const affiliations = document.getElementById('affiliations').innerHTML.trim();
    const articleDates = document.getElementById('article-dates').innerHTML.trim();
    const articleBody = document.getElementById('article-body').innerHTML.trim();
    const articleReferences = document.getElementById('article-references').innerHTML.trim();

    const articleAbstract = document.getElementById('article-abstract')?.innerHTML.trim() || '';
    const articleAcknowledgments = document.getElementById('article-acknowledgments')?.innerHTML.trim() || '';

    // Plantilla HTML completa
    const fullTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
        ${currentTemplateCSS}
    </style>
</head>
<body>
    <div class="container_theme">
        <button class="theme_claro" id="theme_claro">claro</button>
        <button class="theme_oscuro" id="theme_oscuro">oscuro</button>
    </div>
    ${currentTemplateHTML}
    <script>
        ${THEME_SCRIPT_STRING}
    </script>
</body>
</html>`;

    // Reemplazar marcadores de posición (incluyendo los nuevos)
    let finalHTML = fullTemplate
        .replace(/{{META_JOURNAL_INFO}}/g, journalInfo)
        .replace(/{{ARTICLE_TITLE}}/g, title)
        .replace(/{{ARTICLE_TITLE_EN}}/g, titleEn)
        .replace(/{{META_EDITORIAL}}/g, editorial)
        .replace(/{{META_DOI}}/g, doiText)
        .replace(/{{AUTHOR_LIST}}/g, authorList)
        .replace(/{{AFFILIATIONS}}/g, affiliations)
        .replace(/{{ARTICLE_DATES}}/g, articleDates)
        // NUEVOS REEMPLAZOS
        .replace(/{{ARTICLE_ABSTRACT}}/g, articleAbstract)
        .replace(/{{ARTICLE_BODY}}/g, articleBody)
        .replace(/{{ARTICLE_ACKNOWLEDGMENTS}}/g, articleAcknowledgments)
        .replace(/{{ARTICLE_REFERENCES}}/g, articleReferences);


    // Si estamos en modo exportación, mantener contenido editable
    if (!exportMode) {
        finalHTML = finalHTML.replace(/contenteditable="true"/g, 'contenteditable="false"');
    }

    return finalHTML;
}

// =====================================================================
// 5. FUNCIONES DE ZOOM Y PREVISUALIZACIÓN
// =====================================================================

// Función para aplicar zoom al iframe
function applyZoomToPreview() {
    const iframe = document.getElementById('previewIframe');
    if (iframe && iframe.src && iframe.src !== 'about:blank') {
        iframe.style.transform = `scale(${zoomLevel})`;
        iframe.style.transformOrigin = 'top left';
        iframe.style.width = `${100 / zoomLevel}%`;
        iframe.style.height = `${100 / zoomLevel}%`;
        
        // Actualizar el indicador de zoom
        const zoomIndicator = document.getElementById('currentZoom');
        if (zoomIndicator) {
            zoomIndicator.textContent = `${Math.round(zoomLevel * 100)}%`;
        }
    }
}

// Función para alternar pantalla completa
function toggleFullscreenPreview() {
    const iframe = document.getElementById('previewIframe');
    if (iframe) {
        iframe.classList.toggle('fullscreen');
        
        const btn = document.getElementById('fullscreenBtn');
        const icon = btn.querySelector('i');
        if (iframe.classList.contains('fullscreen')) {
            icon.className = 'fa-solid fa-compress';
            btn.title = 'Salir de pantalla completa (ESC)';
            
            // En pantalla completa, desactivar transformaciones de zoom
            iframe.style.transform = 'none';
            iframe.style.width = '100%';
            iframe.style.height = '100%';
        } else {
            icon.className = 'fa-solid fa-expand';
            btn.title = 'Pantalla completa (F11)';
            applyZoomToPreview(); // Reaplicar zoom al salir
        }
    }
}

// Función para cambiar el modo de previsualización
function togglePreviewMode() {
    const editorContainer = document.querySelector('.container-editor');
    const previewContainer = document.getElementById('previewContainer');
    const toggleBtn = document.getElementById('toggleModeBtn');
    
    if (isEditingMode) {
        // --- Cambiar a Modo Previsualización ---
        if (!currentTemplateHTML) {
            alert("Por favor, selecciona y carga una plantilla primero.");
            return;
        }
        
        // Resetear zoom
        zoomLevel = 1.0;
        
        const finalHTML = generateFinalHTML(false);
        const blob = new Blob([finalHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        const iframe = document.getElementById('previewIframe');
        iframe.src = url;
        
        iframe.onload = function() {
            applyZoomToPreview();
        };

        editorContainer.style.display = 'none';
        previewContainer.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fa-solid fa-pen"></i> Volver a Edición';
        isEditingMode = false;
        
    } else {
        // --- Cambiar a Modo Edición ---
        editorContainer.style.display = 'block';
        previewContainer.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fa-solid fa-eye"></i> Previsualizar';
        
        const iframe = document.getElementById('previewIframe');
        iframe.src = 'about:blank';
        iframe.classList.remove('fullscreen');
        iframe.style.transform = 'none';
        iframe.style.width = '100%';
        iframe.style.height = '80vh';
        
        isEditingMode = true;
    }
}

// =====================================================================
// 6. EXPORTACIÓN (Descarga)
// =====================================================================

function exportHTML() {
    if (!currentTemplateHTML) {
        alert("Por favor, selecciona y carga una plantilla primero.");
        return;
    }

    // Validar contenido mínimo
    const title = document.getElementById('article-title').textContent.trim();
    if (!title) {
        alert("Por favor, ingresa un título principal para el artículo.");
        return;
    }

    // Generar el HTML final en modo exportación
    const finalHTML = generateFinalHTML(true);

    // Crear el Blob y forzar la descarga
    const blob = new Blob([finalHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const fileName = title.substring(0, 40)
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase() + '.html';

    a.href = url;
    a.download = fileName;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// =====================================================================
// 7. INICIALIZACIÓN
// =====================================================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Configurar eventos de foco y selección
    document.querySelectorAll('[contenteditable="true"]').forEach(element => {
        element.addEventListener('focus', saveFocus);
        element.addEventListener('click', saveFocus);
        element.addEventListener('keyup', updateToolbarButtons);
        element.addEventListener('mouseup', updateToolbarButtons);
    });

    // 2. Configurar botones de la toolbar
    document.querySelectorAll('.toolbar button').forEach(button => {
        const command = button.dataset.command;
        const value = button.dataset.value;
        
        if (command) {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                formatDoc(command, value);
            });
        }
        
        if (!command && button.id) {
            if (button.id.includes('Superscript') || button.id.includes('Subscript')) {
                const cmd = button.id.includes('Superscript') ? 'superscript' : 'subscript';
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    formatDoc(cmd);
                });
            }
        }
    });

    // 3. Configurar selector de plantillas
    const templateSelector = document.getElementById('templateSelector');
    
    // Llenar selector
    for (const [id, info] of Object.entries(TEMPLATE_INFO)) {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = info.name;
        templateSelector.appendChild(option);
    }
    
    // Cargar primera plantilla por defecto
    loadTemplate(templateSelector.value);
    
    // Configurar cambio de plantilla
    templateSelector.addEventListener('change', (e) => {
        const selectedTemplate = e.target.value;
        console.log(`Cambiando a plantilla: ${selectedTemplate}`);
        
        // Cargar la nueva plantilla y forzar actualización de previsualización si está activa
        loadTemplate(selectedTemplate, true);
    });

    // 4. Configurar botones principales
    document.getElementById('exportBtn').addEventListener('click', exportHTML);
    document.getElementById('toggleModeBtn').addEventListener('click', togglePreviewMode);

    // 5. Configurar botón de insertar imagen
    document.getElementById('btnInsertImage')?.addEventListener('click', () => {
        insertImage();
    });

    // 6. Configurar controles de previsualización
    document.getElementById('zoomInBtn')?.addEventListener('click', () => {
        if (zoomLevel < MAX_ZOOM) {
            zoomLevel += ZOOM_STEP;
            applyZoomToPreview();
        }
    });
    
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => {
        if (zoomLevel > MIN_ZOOM) {
            zoomLevel -= ZOOM_STEP;
            applyZoomToPreview();
        }
    });
    
    document.getElementById('resetZoomBtn')?.addEventListener('click', () => {
        zoomLevel = 1.0;
        applyZoomToPreview();
    });
    
    document.getElementById('fullscreenBtn')?.addEventListener('click', toggleFullscreenPreview);
    
    // 7. Atajos de teclado
    document.addEventListener('keydown', (e) => {
        // Salir de pantalla completa con ESC
        if (e.key === 'Escape') {
            const iframe = document.getElementById('previewIframe');
            if (iframe && iframe.classList.contains('fullscreen')) {
                toggleFullscreenPreview();
            }
        }
        
        // Atajos de zoom (Ctrl + y Ctrl -)
        if (e.ctrlKey && !isEditingMode) {
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                if (zoomLevel < MAX_ZOOM) {
                    zoomLevel += ZOOM_STEP;
                    applyZoomToPreview();
                }
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                if (zoomLevel > MIN_ZOOM) {
                    zoomLevel -= ZOOM_STEP;
                    applyZoomToPreview();
                }
            } else if (e.key === '0') {
                e.preventDefault();
                zoomLevel = 1.0;
                applyZoomToPreview();
            }
        }
    });

    // 8. Detectar cambios de selección para actualizar botones
    document.addEventListener('selectionchange', updateToolbarButtons);
    
    // 9. Actualizar botones al hacer clic en cualquier parte
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.toolbar')) {
            setTimeout(updateToolbarButtons, 10);
        }
    });

    console.log('Aplicación inicializada correctamente.');
});

document.querySelectorAll(".toolbar button:not(#btnInsertImage)").forEach(btn => {
    btn.addEventListener("click", () => {
        btn.classList.toggle("active");
    });
});
