import { Worksheet, Exercise, Topic } from '../types';
import { parseMarkdown, extractAudioUrl } from '../utils/markdownParser';
import { format } from 'date-fns';

interface PrintWorksheetOptions {
  worksheet: Worksheet;
  exercises: Exercise[];
  topicsMap: Record<string, Topic>;
  translations: {
    title: string;
    score: string;
    pending: string;
  };
}

/**
 * Converts markdown with input tags to print-friendly HTML
 * Replaces input fields with clearly visible gaps
 * For dictation exercises, shows audio icon indicator only (no correct text)
 */
const convertMarkdownToPrintHtml = (markdown: string, exercise?: Exercise): string => {
  // Check if this is a dictation exercise
  const isDictation = !!(exercise?.audioUrl || extractAudioUrl(markdown));
  
  if (isDictation) {
    // For dictation: show audio icon indicator only, no correct text
    return '<span class="dictation-indicator">🎧 [Audio Dictation]</span>';
  }
  
  // For fill gaps: parse and show gaps
  const parsed = parseMarkdown(markdown);
  let html = '';

  parsed.parts.forEach((part) => {
    if (part.isGap) {
      // Create a clearly visible gap with underline
      html += '<span class="print-gap">_____________</span>';
    } else {
      // Escape HTML and preserve whitespace
      const text = part.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      html += text;
    }
  });

  return html;
};

/**
 * Generates print-friendly HTML for a worksheet
 */
export const generatePrintHtml = ({
  worksheet,
  exercises,
  topicsMap,
  translations,
}: PrintWorksheetOptions): string => {
  // Group exercises by topic
  const exercisesByTopic = exercises.reduce((acc, exercise) => {
    if (!acc[exercise.topicId]) {
      acc[exercise.topicId] = [];
    }
    acc[exercise.topicId].push(exercise);
    return acc;
  }, {} as Record<string, Exercise[]>);

  // Build HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${translations.title}</title>
        <meta charset="UTF-8">
        <style>
          @media print {
            body { 
              margin: 0; 
              padding: 20px; 
            }
            .no-print { 
              display: none; 
            }
            .print-gap {
              border-bottom: 3px solid #000 !important;
              background-color: #f9f9f9 !important;
            }
          }
          
          @media screen {
            body {
              background-color: #f5f5f5;
            }
          }
          
          body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            padding: 12px;
            max-width: 100%;
            margin: 0 auto;
            background-color: white;
            color: #333;
            line-height: 1.3;
          }
          
          .worksheet-container {
            display: flex;
            flex-direction: column;
          }
          
          .worksheet-header {
            margin-bottom: 15px;
          }
          
          .exercises-container {
            column-count: 2;
            column-gap: 20px;
            column-fill: auto;
          }
          
          h1 {
            font-size: 20px;
            margin-bottom: 8px;
            border-bottom: 2px solid #333;
            padding-bottom: 6px;
            color: #1976d2;
          }
          
          .worksheet-date {
            font-size: 12px;
            color: #666;
            font-weight: normal;
            margin-left: 8px;
          }
          
          .worksheet-info {
            margin-bottom: 10px;
            padding: 8px;
            background-color: #f9f9f9;
            border-left: 3px solid #1976d2;
            border-radius: 3px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .worksheet-info .score {
            font-size: 14px;
            font-weight: bold;
            color: #1976d2;
          }
          
          .worksheet-info .status {
            font-size: 14px;
            color: #666;
            font-style: italic;
          }
          
          .topic-section {
            margin-bottom: 15px;
            page-break-inside: avoid;
            break-inside: avoid;
            display: inline-block;
            width: 100%;
          }
          
          .topic-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #1976d2;
            padding-bottom: 4px;
            border-bottom: 1px solid #e0e0e0;
          }
          
          .exercise {
            margin-bottom: 8px;
            padding: 6px;
            border-left: 3px solid #ddd;
            padding-left: 10px;
            background-color: #fafafa;
            border-radius: 3px;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          .exercise-content {
            font-size: 14px;
            line-height: 1.4;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          
          .print-gap {
            display: inline-block;
            min-width: 30px;
            height: 8px;
            border-bottom: 2px solid #000;
            background-color: #f9f9f9;
            margin: 0 2px;
            padding: 0 2px;
            vertical-align: middle;
            position: relative;
          }
          
          .print-gap::after {
            content: '';
            position: absolute;
            bottom: -3px;
            left: 0;
            right: 0;
            height: 3px;
            background-color: #000;
          }
          
          .score {
            font-size: 16px;
            font-weight: bold;
            margin-top: 3px;
          }
          
          @page {
            margin: 1cm;
            size: A4;
          }
          
          @media print {
            .exercises-container {
              column-count: 2;
              column-gap: 20px;
            }
            
            .topic-section {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            .exercise {
              page-break-inside: avoid;
              break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="worksheet-container">
          <div class="worksheet-header">
            <h1>
              ${translations.title}
              <span class="worksheet-date">
                - ${(() => {
                  let date: Date;
                  if (worksheet.createdAt && typeof worksheet.createdAt === 'object' && 'toDate' in worksheet.createdAt) {
                    date = worksheet.createdAt.toDate();
                  } else if (worksheet.createdAt) {
                    date = new Date(worksheet.createdAt as any);
                  } else {
                    date = new Date();
                  }
                  return format(date, 'MMMM dd, yyyy');
                })()}
              </span>
            </h1>
            ${
              worksheet.status === 'completed' && worksheet.score !== undefined
                ? `<div class="worksheet-info">
                    <div class="score">${translations.score}: ${Math.round(worksheet.score)}%</div>
                  </div>`
                : ''
            }
          </div>
          <div class="exercises-container">
            ${Object.entries(exercisesByTopic)
          .map(([topicId, topicExercises]) => {
            const topic = topicsMap[topicId];
            if (!topic) return '';

            return `
              <div class="topic-section">
                <div class="topic-title">${topic.taskDescription}</div>
                ${topicExercises
                  .map((exercise) => {
                    const exerciseHtml = convertMarkdownToPrintHtml(exercise.markdown, exercise);
                    return `
                      <div class="exercise">
                        <div class="exercise-content">${exerciseHtml}</div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>
            `;
          })
          .join('')}
          </div>
        </div>
      </body>
    </html>
  `;

  return htmlContent;
};

/**
 * Opens a print dialog for the worksheet
 */
export const printWorksheet = (options: PrintWorksheetOptions): void => {
  const htmlContent = generatePrintHtml(options);

  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Failed to open print window. Please check popup blocker settings.');
    return;
  }

  // Write content to the window
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    // Small delay to ensure all styles are loaded
    setTimeout(() => {
      printWindow.print();
      // Optionally close after printing (commented out to allow user to review)
      // printWindow.close();
    }, 250);
  };
};
