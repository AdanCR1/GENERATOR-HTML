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
    document.querySelectorAll('.toolbar button').forEach(btn => {
        btn.classList.remove('active');
    });

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    if (!range) return;

    try {
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

        // Verificar enlace
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

        // Verificar texto centrado - VERSIÓN MEJORADA
        try {
            const alignBtn = document.querySelector('button[data-command="alignCenter"]');
            if (alignBtn) {
                const container = range.commonAncestorContainer;
                const element = container.nodeType === 3 ? container.parentElement : container;
                const closestBlock = element.closest('p, div, h1, h2, h3, h4, h5, h6, li');

                const isCentered = closestBlock && (
                    closestBlock.classList.contains('text-align') || 
                    closestBlock.style.textAlign === 'center' ||
                    window.getComputedStyle(closestBlock).textAlign === 'center'
                );
            
                if (isCentered) {
                    alignBtn.classList.add('active');
                } else {
                    alignBtn.classList.remove('active');
                }
            }
        } catch (e) {
            console.warn('Error verificando texto centrado:', e);
        }

        // Verificar encabezados
        const heading = document.queryCommandValue('formatBlock').toLowerCase().replace(/[^a-z0-9]/g, '');
        const validHeadings = ['h1', 'h2', 'h3', 'p'];
        
        if (validHeadings.includes(heading)) {
            const btn = document.querySelector(`button[data-value="${heading}"]`);
            if (btn) btn.classList.add('active');
        }

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
                createLinkWithClass();
                break;
            case 'insertImage':
                insertImage();
                break;
            case 'alignCenter':
                alignTextCenter();
                break;
            case 'insertUnorderedList':
                document.execCommand('insertUnorderedList', false, null);
                break;
            case 'removeFormat':
                document.execCommand('removeFormat', false, null);
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
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const imageUrl = event.target.result;
            
            const activeElement = lastFocusedElement || document.activeElement;
            if (activeElement && activeElement.hasAttribute('contenteditable')) {
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                
                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = 'Imagen insertada (RAE-USFX)';
                
                range.insertNode(img);
                
                range.setStartAfter(img);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
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

function createLinkWithClass() {
    const url = prompt('Introduce el enlace (URL):', 'https://');
    if (url) {
        saveFocus();
        
        const selection = window.getSelection();
        if (!selection.toString().trim()) {
            alert('Primero selecciona el texto que quieres convertir en enlace.');
            restoreFocus();
            return;
        }
        
        document.execCommand('createLink', false, url);
        
        const range = selection.getRangeAt(0);
        if (range) {
            const parentAnchor = range.commonAncestorContainer;
            const anchor = parentAnchor.nodeType === 3 
                ? parentAnchor.parentNode.closest('a')
                : parentAnchor.closest('a');
                
            if (anchor) {
                anchor.classList.add('a_doi');
                
                if (url.includes('doi.org') || url.includes('http')) {
                    anchor.setAttribute('target', '_blank');
                    anchor.setAttribute('rel', 'noopener noreferrer');
                }
            }
        }
        
        restoreFocus();
    }
}



function alignTextCenter() {
    saveFocus();
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    let container = range.commonAncestorContainer;

    // Asegurarnos de tener un elemento y no un nodo de texto
    if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentElement;
    }

    // Buscamos el bloque contenedor más cercano (párrafo, título, etc.)
    const block = container.closest('p, div, h1, h2, h3, h4, h5, h6, li');

    if (block) {
        // Alternar la clase 'text-align' (Asegúrate que tu CSS tenga .text-align { text-align: center !important; })
        if (block.classList.contains('text-align')) {
            block.classList.remove('text-align');
            block.style.textAlign = ''; // Limpiar estilo inline si existiera
        } else {
            block.classList.add('text-align');
            block.style.textAlign = 'center'; // Aseguramos el centrado inmediato
        }
    } else {
        // Si no hay un bloque (texto suelto), usamos el comando nativo que es más seguro
        document.execCommand('justifyCenter', false, null);
    }
    
    restoreFocus();
    setTimeout(updateToolbarButtons, 100);
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
        const responseHTML = await fetch(info.html);
        currentTemplateHTML = await responseHTML.text();

        const responseCSS = await fetch(info.css);
        currentTemplateCSS = await responseCSS.text();

        console.log(`Plantilla "${info.name}" cargada.`);
        document.getElementById('appTitle').textContent = `Generador de Artículos Científicos - ${info.name}`;
        
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
        return;
    }
    
    console.log('Actualizando previsualización con nueva plantilla...');
    
    const finalHTML = generateFinalHTML(false);
    const blob = new Blob([finalHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const iframe = document.getElementById('previewIframe');
    
    const previousScrollTop = iframe.contentDocument?.documentElement?.scrollTop || 0;
    
    iframe.src = url;
    
    iframe.onload = function() {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDoc && iframeDoc.documentElement) {
                iframeDoc.documentElement.scrollTop = previousScrollTop;
            }
        } catch (e) {
            console.log('No se pudo restaurar la posición del scroll');
        }
        
        applyZoomToPreview();
    };
}

// =====================================================================
// 4. GENERACIÓN DE HTML FINAL
// =====================================================================

function generateFinalHTML(exportMode = false) {
    // 1. Capturar los valores de los campos
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
    const articleAbstractEs = document.getElementById('article-abstract-es')?.innerHTML.trim() || '';
    const articleAbstractEn = document.getElementById('article-abstract-en')?.innerHTML.trim() || '';
    const articleAcknowledgments = document.getElementById('article-acknowledgments')?.innerHTML.trim() || '';
    const articleKeywordsEs = document.getElementById('article-keywords-es')?.innerHTML.trim() || '';
    const articleKeywordsEn = document.getElementById('article-keywords-en')?.innerHTML.trim() || '';
    const number = document.getElementById('number')?.innerHTML.trim() || '';

    // 2. Preparar la estructura base
    const fullTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>${currentTemplateCSS}</style>
</head>
<body>
    <div class="container_theme">
        <button class="theme_claro" id="theme_claro">claro</button>
        <button class="theme_oscuro" id="theme_oscuro">oscuro</button>
    </div>
    ${currentTemplateHTML}
    <script>${THEME_SCRIPT_STRING}</script>
</body>
</html>`;

    // 3. Reemplazar variables (Placeholders)
    let finalHTML = fullTemplate
        .replace(/{{META_JOURNAL_INFO}}/g, journalInfo)
        .replace(/{{ARTICLE_TITLE}}/g, title)
        .replace(/{{ARTICLE_TITLE_EN}}/g, titleEn)
        .replace(/{{META_EDITORIAL}}/g, editorial)
        .replace(/{{META_DOI}}/g, doiText)
        .replace(/{{AUTHOR_LIST}}/g, authorList)
        .replace(/{{AFFILIATIONS}}/g, affiliations)
        .replace(/{{ARTICLE_DATES}}/g, articleDates)
        .replace(/{{ARTICLE_ABSTRACT_ES}}/g, articleAbstractEs)
        .replace(/{{ARTICLE_ABSTRACT_EN}}/g, articleAbstractEn)
        .replace(/{{ARTICLE_KEYWORDS_ES}}/g, articleKeywordsEs)
        .replace(/{{ARTICLE_KEYWORDS_EN}}/g, articleKeywordsEn)
        .replace(/{{ARTICLE_BODY}}/g, articleBody)
        .replace(/{{ARTICLE_ACKNOWLEDGMENTS}}/g, articleAcknowledgments)
        .replace(/{{ARTICLE_REFERENCES}}/g, articleReferences)
        .replace(/{{NUMBER}}/g, number);

    // 4. LIMPIEZA DE CONTENTEDITABLE (Procesamiento DOM)
    // Creamos un elemento temporal para manipular el HTML de forma segura
    const parser = new DOMParser();
    const doc = parser.parseFromString(finalHTML, 'text/html');
    
    // Buscamos TODOS los elementos que tengan el atributo y lo eliminamos
    const editableElements = doc.querySelectorAll('[contenteditable]');
    editableElements.forEach(el => {
        el.removeAttribute('contenteditable');
    });

    // 5. Retornar el HTML limpio como string
    return doc.documentElement.outerHTML;
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
            btn.title = 'Salir de pantalla completa';
            
            iframe.style.transform = 'none';
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            
            createExitFullscreenButton();
            
        } else {
            icon.className = 'fa-solid fa-expand';
            btn.title = 'Pantalla completa (F11)';
            applyZoomToPreview();
            
            removeExitFullscreenButton();
        }
    }
}

function createExitFullscreenButton() {
    removeExitFullscreenButton();
    
    const exitBtn = document.createElement('button');
    exitBtn.id = 'exitFullscreenBtn';
    exitBtn.className = 'exit-fullscreen-btn';
    exitBtn.innerHTML = '<i class="fa-solid fa-left-long"></i>';
    exitBtn.title = 'Salir de pantalla completa (ESC)';
    
    exitBtn.style.cssText = `
        position: fixed;
        top: 20px;
        left: 10px;
        z-index: 10000;
        background: rgba(56, 147, 0, 0.8);
        color: white;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 5px;
        padding: 12px 20px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    `;
    
    exitBtn.onmouseenter = function() {
        this.style.background = 'rgba(28, 143, 7, 0.79)';
        this.style.borderColor = 'rgba(255, 208, 0, 0.6)';
        this.style.transform = 'translateY(-2px)';
    };
    
    exitBtn.onmouseleave = function() {
        this.style.background = 'rgba(35, 110, 0, 0.97)';
        this.style.borderColor = 'rgba(225, 255, 0, 0.3)';
        this.style.transform = 'translateY(0)';
    };
    
    exitBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleFullscreenPreview();
    };
    
    document.body.appendChild(exitBtn);
    
    try {
        const iframeDoc = document.getElementById('previewIframe').contentDocument;
        if (iframeDoc && iframeDoc.body) {
            const iframeExitBtn = exitBtn.cloneNode(true);
            iframeExitBtn.id = 'exitFullscreenBtnIframe';
            iframeExitBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                toggleFullscreenPreview();
            };
            iframeDoc.body.appendChild(iframeExitBtn);
        }
    } catch (e) {
        console.log('No se pudo agregar botón al iframe:', e);
    }
}

// Función para remover el botón de salir
function removeExitFullscreenButton() {
    const exitBtn = document.getElementById('exitFullscreenBtn');
    if (exitBtn) {
        exitBtn.remove();
    }
    
    try {
        const iframe = document.getElementById('previewIframe');
        if (iframe.contentDocument) {
            const iframeExitBtn = iframe.contentDocument.getElementById('exitFullscreenBtnIframe');
            if (iframeExitBtn) {
                iframeExitBtn.remove();
            }
        }
    } catch (e) {
    }
}

// Función para cambiar el modo de previsualización
function togglePreviewMode() {
    const editorContainer = document.querySelector('.container-editor');
    const previewContainer = document.getElementById('previewContainer');
    const toggleBtn = document.getElementById('toggleModeBtn');
    
    if (isEditingMode) {
        if (!currentTemplateHTML) {
            alert("Por favor, selecciona y carga una plantilla primero.");
            return;
        }
        
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

    const title = document.getElementById('article-title').textContent.trim();
    if (!title) {
        alert("Por favor, ingresa un título principal para el artículo.");
        return;
    }

    const finalHTML = generateFinalHTML(true);

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
                
                setTimeout(updateToolbarButtons, 50);
            });
        }
        
        if (!command && button.id) {
            if (button.id.includes('Superscript') || button.id.includes('Subscript')) {
                const cmd = button.id.includes('Superscript') ? 'superscript' : 'subscript';
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    formatDoc(cmd);
                    setTimeout(updateToolbarButtons, 50);
                });
            }
        }
    });

    // 3. Configurar selector de plantillas
    const templateSelector = document.getElementById('templateSelector');
    
    for (const [id, info] of Object.entries(TEMPLATE_INFO)) {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = info.name;
        templateSelector.appendChild(option);
    }
    
    loadTemplate(templateSelector.value);
    
    templateSelector.addEventListener('change', (e) => {
        const selectedTemplate = e.target.value;
        console.log(`Cambiando a plantilla: ${selectedTemplate}`);
        
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
        if (e.key === 'Escape') {
            const iframe = document.getElementById('previewIframe');
            if (iframe && iframe.classList.contains('fullscreen')) {
                toggleFullscreenPreview();
            }
        }
        
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