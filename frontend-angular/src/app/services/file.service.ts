import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';

@Injectable({
    providedIn: 'root'
})
export class FileService {

    constructor() {
        // Set worker source to local asset ensuring it matches the angular.json configuration
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';
    }

    async extractText(file: File): Promise<string> {
        const ext = file.name.split('.').pop()?.toLowerCase();

        if (ext === 'pdf') {
            return this.extractPdfText(file);
        } else if (ext === 'docx') {
            return this.extractDocxText(file);
        } else if (['txt', 'md', 'html'].includes(ext || '')) {
            return this.extractPlainText(file);
        } else {
            throw new Error(`Unsupported file type: ${ext}`);
        }
    }

    private async extractPlainText(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    private async extractPdfText(file: File): Promise<string> {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
            fullText += pageText + '\n\n';
        }

        return fullText;
    }

    private async extractDocxText(file: File): Promise<string> {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        return result.value;
    }
}
