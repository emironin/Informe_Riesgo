document.addEventListener('DOMContentLoaded', function () {
    // --- ELEMENTS ---
    const logoUpload = document.getElementById('logo-upload');
    const logoPreview = document.getElementById('logo-preview');
    const photoUpload = document.getElementById('photo-upload');
    const photoPreview = document.getElementById('photo-preview');
    const riskRadios = document.querySelectorAll('input[name="risk"]');
    const riskDisplay = document.getElementById('risk-display');
    const exportPdfBtn = document.getElementById('export-pdf');
    const emailModal = document.getElementById('email-modal');
    const loadingModal = document.getElementById('loading-modal');
    const loadingText = document.getElementById('loading-text');
    const emailYesBtn = document.getElementById('email-yes');
    const emailNoBtn = document.getElementById('email-no');
    
    // --- INITIALIZATION ---
    document.getElementById('datetime').textContent = new Date().toLocaleString('es-AR');

    // Función para convertir una URL de imagen a Data URL
    // Esto es crucial para CORS y html2canvas con imágenes externas.
    const urlToDataUrl = (url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous'; // Importante para evitar problemas de CORS
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png')); // Usar PNG para mejor calidad y soporte de transparencia
            };
            img.onerror = (error) => {
                console.error("Error al cargar la imagen para convertir a Data URL:", url, error);
                // Si falla, aún resolvemos con la URL original o un placeholder para no detener el PDF
                resolve(url); 
            };
            img.src = url;
        });
    };

    // Al cargar la página, convierte las imágenes placeholder a Data URLs
    // Esto asegura que incluso las imágenes por defecto sean seguras para html2canvas.
    Promise.all([
        urlToDataUrl(logoPreview.src),
        urlToDataUrl(photoPreview.src)
    ]).then(([logoDefaultDataUrl, photoDefaultDataUrl]) => {
        logoPreview.src = logoDefaultDataUrl;
        photoPreview.src = photoDefaultDataUrl;
    }).catch(error => {
        console.error("Error al convertir imágenes placeholder:", error);
    });

    // --- EVENT LISTENERS ---
    const handleImageUpload = (event, previewElement) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewElement.src = e.target.result; // e.target.result is the base64 Data URL
            };
            reader.readAsDataURL(file);
        }
    };
    logoUpload.addEventListener('change', (e) => handleImageUpload(e, logoPreview));
    photoUpload.addEventListener('change', (e) => handleImageUpload(e, photoPreview));

    riskRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            riskDisplay.textContent = this.value;
            riskDisplay.style.opacity = '1';
            riskDisplay.className = 'font-bold uppercase px-4 py-2 rounded-md';
            riskDisplay.classList.add(...this.dataset.colorClass.split(' '));
        });
    });

    // --- PDF EXPORT (ROBUST VERSION) ---
    exportPdfBtn.addEventListener('click', async function() {
        loadingModal.classList.remove('hidden');
        loadingText.textContent = "Generando PDF...";

        // Esta función ahora solo devuelve el src, que ya debería ser una Data URL
        // gracias a `handleImageUpload` o a la inicialización con `urlToDataUrl`.
        const getImageData = (imgElement) => {
            return Promise.resolve(imgElement.src); // Ya es una Data URL
        };

        try {
            const logoDataUrl = await getImageData(logoPreview);
            const photoDataUrl = await getImageData(photoPreview);

            const companyName = document.getElementById('company-name').value;
            const observations = document.getElementById('observations').value.replace(/\n/g, '<br>');
            const selectedRisk = document.querySelector('input[name="risk"]:checked');
            
            let riskHTML = '';
            if (selectedRisk) {
                riskHTML = `<div class="mt-4 text-center"><p class="font-bold uppercase px-4 py-2 rounded-md inline-block ${selectedRisk.dataset.colorClass}">${selectedRisk.value}</p></div>`;
            }
            
            const exportHTML = `
                <div class="grid grid-cols-3 gap-4 mb-6 items-center">
                    <div class="col-span-1"><img src="${logoDataUrl}" class="w-full h-auto object-cover rounded-md"></div>
                    <div class="col-span-2 space-y-1 text-sm">
                        <p><strong>Empresa:</strong> ${companyName || 'N/A'}</p>
                        <p><strong>CUIT:</strong> ${document.getElementById('cuit').value || 'N/A'}</p>
                        <p><strong>Teléfono:</strong> ${document.getElementById('phone').value || 'N/A'}</p>
                        <p><strong>Email:</strong> ${document.getElementById('email').value || 'N/A'}</p>
                    </div>
                </div>
                <div class="mb-6"><p class="text-sm text-gray-600"><strong>Fecha y Hora:</strong> ${document.getElementById('datetime').textContent}</p></div>
                <hr class="mb-6">
                <h2 class="font-bold text-lg mb-2 text-center">Evidencia y Riesgo</h2>
                <div class="flex justify-center"><img src="${photoDataUrl}" alt="Evidencia" class="max-w-md w-full rounded-lg"></div>
                ${riskHTML}
                <div class="mt-6">
                    <h2 class="font-bold text-lg mb-2">Observaciones</h2>
                    <div class="p-2 border rounded-md bg-gray-50 text-sm" style="min-height: 100px;">${observations || 'Sin observaciones.'}</div>
                </div>`;

            const pdfExportContent = document.getElementById('pdf-export-content');
            pdfExportContent.innerHTML = exportHTML;

            loadingText.textContent = "Creando archivo PDF...";
            // Asegúrate de que el contenido a exportar esté visible para html2canvas si es necesario, aunque hidden con width/height 0px puede ser un problema
            // Asegúrate de que pdf-export-content no tenga display:none, sino visibility: hidden o position: absolute fuera de la pantalla.
            // Para este ejemplo, como ya tiene un width fijo, debería funcionar.
            const originalDisplay = pdfExportContent.style.display;
            pdfExportContent.style.display = 'block'; // Temporalmente hazlo visible para html2canvas si estaba hidden

            const canvas = await html2canvas(pdfExportContent, { 
                scale: 2, 
                useCORS: true,
                allowTaint: false, // Asegúrate de que no se permita la "contaminación"
                foreignObjectRendering: true // Puede ayudar con algunos elementos HTML complejos
            });
            
            pdfExportContent.style.display = originalDisplay; // Restaura el display original

            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgWidth = pdfWidth;
            const imgHeight = canvas.height * imgWidth / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`InformeDeRiesgo_${companyName || 'SinNombre'}_${new Date().toISOString().slice(0, 10)}.pdf`);
            
            emailModal.classList.remove('hidden');

        } catch (error) {
            console.error("Error al generar el PDF:", error);
            loadingText.textContent = "Error al generar el PDF. Revise la consola.";
            setTimeout(() => loadingModal.classList.add('hidden'), 3000);
            return;
        }

        loadingModal.classList.add('hidden');
        document.getElementById('pdf-export-content').innerHTML = '';
    });

    // Modal Buttons
    emailNoBtn.addEventListener('click', () => emailModal.classList.add('hidden'));
    emailYesBtn.addEventListener('click', () => {
        const email = document.getElementById('email').value || '';
        const subject = `Informe de Riesgo - ${document.getElementById('company-name').value || 'Reporte'}`;
        const body = `Hola,\n\nAdjunto el informe de riesgo generado.\n\nSaludos.`;
        window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        emailModal.classList.add('hidden');
    });
});

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('✅ Service Worker Registrado.', reg))
            .catch(err => console.log('❌ Error al registrar Service Worker:', err));
    });
}
