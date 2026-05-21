/**
 * FinovaAI - Client-side Receipt Scanning Engine using TensorFlow.js and Tesseract.js
 */
const FinovaAI = {
  model: null,
  initialized: false,

  /**
   * Initializes the TensorFlow.js model
   * @param {string} modelPath - The path to the model.json file
   */
  async init(modelPath = './tfjs/model.json') {
    if (this.initialized) {
      console.log('FinovaAI already initialized.');
      return;
    }
    console.log('FinovaAI: Initializing TensorFlow.js engine...');
    try {
      // Load TFJS model
      if (typeof tf !== 'undefined') {
        this.model = await tf.loadLayersModel(modelPath);
        console.log('FinovaAI: TensorFlow.js model successfully loaded from:', modelPath);
      } else {
        console.warn('FinovaAI: TensorFlow.js library not found on window. Model loading skipped.');
      }
      this.initialized = true;
      console.log('FinovaAI: Engine successfully initialized.');
    } catch (error) {
      console.error('FinovaAI: Failed to load TensorFlow.js model:', error);
      // Fallback: we still set initialized to true so receipt OCR can function even if model load fails
      this.initialized = true;
    }
  },

  /**
   * Scans a receipt image file using Tesseract.js OCR and parsers
   * @param {File|Blob|string} file - The file, blob, or URL of the receipt image
   * @returns {Promise<{tanggal: string, total_ocr: number, currency: string, rawText: string}>}
   */
  async scan(file) {
    if (!file) {
      throw new Error('FinovaAI: No file provided for scanning.');
    }

    if (!this.initialized) {
      console.warn('FinovaAI: Not initialized yet. Initializing now with default paths...');
      await this.init();
    }

    console.log('FinovaAI: Starting receipt scan...');
    
    // Dispatch a custom event to notify UI that scanning/OCR has started
    window.dispatchEvent(new CustomEvent('finova-scan-start'));

    try {
      if (typeof Tesseract === 'undefined') {
        throw new Error('FinovaAI: Tesseract.js library not loaded. Make sure the CDN script is included.');
      }

      // Perform OCR
      console.log('FinovaAI: Performing OCR on file...');
      const result = await Tesseract.recognize(file, 'eng+ind', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100);
            window.dispatchEvent(new CustomEvent('finova-scan-progress', { detail: { progress } }));
          }
        }
      });

      const rawText = result.data.text || '';
      console.log('FinovaAI: OCR Complete. Raw text extracted:\n', rawText);

      // Run parsed heuristics on the raw OCR text
      const parsed = this.parseReceiptText(rawText);

      // Dispatch success event
      window.dispatchEvent(new CustomEvent('finova-scan-success', { detail: parsed }));

      return parsed;
    } catch (error) {
      console.error('FinovaAI: Error during receipt scan:', error);
      window.dispatchEvent(new CustomEvent('finova-scan-error', { detail: error.message }));
      throw error;
    }
  },

  /**
   * Helper parser using heuristics, regex, and pattern matching
   * @param {string} text - The raw OCR text
   */
  parseReceiptText(text) {
    const lines = text.split('\n');
    
    let currency = 'Rp'; // Default currency
    let total_ocr = 0;
    let tanggal = new Date().toISOString().split('T')[0]; // Default to today in YYYY-MM-DD

    // 1. Determine Currency
    const lowerText = text.toLowerCase();
    if (lowerText.includes('sgd') || lowerText.includes('s$') || lowerText.includes('singapore dollar')) {
      currency = 'SGD';
    } else if (lowerText.includes('usd') || lowerText.includes('$')) {
      // Check if it has Rp or IDR or Rupiah as well
      if (!(lowerText.includes('rp') || lowerText.includes('rupiah') || lowerText.includes('idr'))) {
        currency = 'USD';
      }
    }

    // 2. Parse Date (Tanggal)
    // Matches formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD, YYYY/MM/DD
    const dateRegex1 = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/; // DD/MM/YYYY or MM/DD/YYYY
    const dateRegex2 = /\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/; // YYYY-MM-DD

    const match2 = text.match(dateRegex2);
    if (match2) {
      const year = match2[1];
      const month = match2[2].padStart(2, '0');
      const day = match2[3].padStart(2, '0');
      tanggal = `${year}-${month}-${day}`;
    } else {
      const match1 = text.match(dateRegex1);
      if (match1) {
        let day = match1[1];
        let month = match1[2];
        let year = match1[3];

        if (year.length === 2) {
          year = '20' + year; // Assumes 20XX
        }

        // Validate values
        const dVal = parseInt(day, 10);
        const mVal = parseInt(month, 10);

        // Simple swap if month > 12
        if (mVal > 12 && dVal <= 12) {
          day = match1[2];
          month = match1[1];
        }

        day = day.padStart(2, '0');
        month = month.padStart(2, '0');

        tanggal = `${year}-${month}-${day}`;
      } else {
        // Look for word months (e.g. Jan, Feb, Maret, etc.)
        const monthsMap = {
          jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', may: '05', jun: '06',
          jul: '07', agu: '08', aug: '08', sep: '09', okt: '10', oct: '10', nov: '11', des: '12', dec: '12'
        };
        const monthWords = Object.keys(monthsMap).join('|');
        const wordDateRegex = new RegExp(`\\b(\\d{1,2})\\s+(${monthWords})[a-z]*\\s+(\\d{2,4})\\b`, 'i');
        const wordMatch = text.match(wordDateRegex);
        if (wordMatch) {
          let day = wordMatch[1].padStart(2, '0');
          let monthWord = wordMatch[2].toLowerCase();
          let month = monthsMap[monthWord];
          let year = wordMatch[3];
          if (year.length === 2) {
            year = '20' + year;
          }
          tanggal = `${year}-${month}-${day}`;
        }
      }
    }

    // Validate tanggal range
    try {
      const tDate = new Date(tanggal);
      if (isNaN(tDate.getTime()) || tDate.getFullYear() < 2000 || tDate.getFullYear() > 2100) {
        tanggal = new Date().toISOString().split('T')[0]; // Reset if invalid date
      }
    } catch (e) {
      tanggal = new Date().toISOString().split('T')[0];
    }

    // 3. Parse Amount / Total (Total OCR)
    // Find lines matching keywords representing the TOTAL sum
    const totalKeywords = [
      'total', 'grand total', 'grandtotal', 'total due', 'amount due', 'amount paid',
      'payable', 'net amount', 'jumlah total', 'jumlah', 'bayar', 'total bayar', 'nilai'
    ];
    // Exclude sub-total, cash, balance, tax, change keywords to avoid false positives
    const excludeKeywords = [
      'subtotal', 'sub-total', 'sub total', 'tax', 'ppn', 'kembali', 'kembalian',
      'cash', 'tunai', 'change', 'diskon', 'discount', 'potongan', 'telp', 'phone'
    ];

    let possibleTotals = [];

    for (let line of lines) {
      const lineLower = line.toLowerCase();
      
      // Check if it has any total keyword
      const hasTotalKeyword = totalKeywords.some(kw => lineLower.includes(kw));
      // Check if it should be excluded
      const hasExcludeKeyword = excludeKeywords.some(kw => lineLower.includes(kw));

      if (hasTotalKeyword && !hasExcludeKeyword) {
        // Extract numbers from this line
        // A standard receipt number can have dots as thousands separator and comma as decimal, or vice versa
        // E.g. Rp 125.000 or Rp 125,000.00 or Rp.125.000,00 or 125000
        // Clean line to extract numbers
        // Remove currency symbols, currency abbreviations, and common noise characters
        let cleanLine = lineLower
          .replace(/rp\.?/g, '')
          .replace(/sgd\.?/g, '')
          .replace(/usd\.?/g, '')
          .replace(/[\$]/g, '')
          .replace(/:/g, ' ')
          .trim();

        // Extract decimal number groups
        // Match numbers like 125.000 or 125,000.00 or 125000
        const numberRegex = /(\d+[\.,\d]*\d+|\d+)/g;
        const matches = cleanLine.match(numberRegex);
        if (matches) {
          for (let numStr of matches) {
            // Strip thousands separators and decimals
            const parsedNum = this.parseNumericString(numStr);
            if (parsedNum > 0 && parsedNum < 100000000) { // realistic transaction bounds
              possibleTotals.push({ value: parsedNum, lineText: line, keywordMatch: true });
            }
          }
        }
      }
    }

    // If we have candidates from Total lines, sort by descending value and pick the highest
    // Usually the main TOTAL is larger than sub-components (tax, items), but smaller than CASH / PAID amount (which we filtered out)
    if (possibleTotals.length > 0) {
      // Sort descending by value
      possibleTotals.sort((a, b) => b.value - a.value);
      total_ocr = possibleTotals[0].value;
      console.log('FinovaAI: Found total amount from keyword-matched lines:', total_ocr, possibleTotals[0]);
    } else {
      // Fallback: If no lines matched "Total", look for the largest number in the entire document
      // that fits typical receipt transaction ranges (e.g. 5,000 to 2,000,000 for standard local receipts)
      let allNumbers = [];
      const numberRegex = /\b(\d+[\.,\d]*\d+|\d+)\b/g;
      const allMatches = text.match(numberRegex);
      if (allMatches) {
        for (let numStr of allMatches) {
          const parsedNum = this.parseNumericString(numStr);
          // Ignore telephone numbers, zip codes, years, and invoice numbers
          if (parsedNum >= 1000 && parsedNum <= 5000000 && parsedNum !== 2024 && parsedNum !== 2025 && parsedNum !== 2026) {
            allNumbers.push(parsedNum);
          }
        }
      }
      if (allNumbers.length > 0) {
        // Sort descending
        allNumbers.sort((a, b) => b - a);
        // Take the largest one as it represents the highest likelihood of being the total amount
        total_ocr = allNumbers[0];
        console.log('FinovaAI: Fallback! Found total from largest numeric value:', total_ocr);
      }
    }

    return {
      tanggal,
      total_ocr,
      currency,
      rawText: text
    };
  },

  /**
   * Helper to parse numeric string like "125.000,00" or "125,000.00" to float
   * @param {string} numStr 
   */
  parseNumericString(numStr) {
    if (!numStr) return 0;
    
    // Remove whitespace
    let clean = numStr.replace(/\s+/g, '');

    // Identify if the string uses Indonesian formatting: dots for thousands, comma for decimals (e.g., 125.000,50)
    // or standard formatting: commas for thousands, dot for decimals (e.g., 125,000.50)
    const lastDotIdx = clean.lastIndexOf('.');
    const lastCommaIdx = clean.lastIndexOf(',');

    if (lastCommaIdx > lastDotIdx && lastCommaIdx === clean.length - 3) {
      // Indonesian format with decimals (e.g. 35.000,00)
      // Replace all dots (thousands) with empty, and comma with dot
      clean = clean.replace(/\./g, '').replace(/,/g, '.');
    } else if (lastDotIdx > lastCommaIdx && lastDotIdx === clean.length - 3) {
      // Standard format with decimals (e.g. 35,000.00)
      // Replace all commas with empty
      clean = clean.replace(/,/g, '');
    } else {
      // No standard decimals or simple numbers with dots/commas as separators (e.g. 35.000 or 35,000)
      // Strip all formatting symbols and parse as integer
      clean = clean.replace(/[\.,]/g, '');
    }

    const value = parseFloat(clean);
    return isNaN(value) ? 0 : value;
  }
};

// Export to window object
if (typeof window !== 'undefined') {
  window.FinovaAI = FinovaAI;
}
