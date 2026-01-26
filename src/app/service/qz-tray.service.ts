import { Injectable } from '@angular/core';

declare var qz: any;

@Injectable({
  providedIn: 'root'
})
export class QzTrayService {
  private isConnected = false;
  private isConnecting = false;

  constructor() {
    // Check if QZ Tray is available
    if (typeof qz === 'undefined') {
      console.warn('⚠️ QZ Tray library not loaded. Make sure QZ Tray is installed and running.');
    }
  }

  /**
   * Check if QZ Tray is installed and available
   */
  isQzTrayAvailable(): boolean {
    return typeof qz !== 'undefined' && qz !== null;
  }

  /**
   * Connect to QZ Tray
   */
  async connect(): Promise<boolean> {
    if (!this.isQzTrayAvailable()) {
      throw new Error('QZ Tray is not available. Please install QZ Tray from https://qz.io');
    }

    if (this.isConnected) {
      return true;
    }

    if (this.isConnecting) {
      // Wait for connection to complete
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.isConnected) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);
      });
    }

    this.isConnecting = true;

    try {
      // Check if already connected
      if (qz.websocket.isActive()) {
        this.isConnected = true;
        this.isConnecting = false;
        return true;
      }

      // Connect to QZ Tray
      await qz.websocket.connect();
      this.isConnected = true;
      this.isConnecting = false;
      console.log('✅ Connected to QZ Tray');
      return true;
    } catch (error: any) {
      this.isConnecting = false;
      console.error('❌ Failed to connect to QZ Tray:', error);
      
      if (error.message && error.message.includes('Connection refused')) {
        throw new Error('QZ Tray is not running. Please start QZ Tray application.');
      }
      
      throw new Error(`Failed to connect to QZ Tray: ${error.message || error}`);
    }
  }

  /**
   * Disconnect from QZ Tray
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      if (qz.websocket.isActive()) {
        await qz.websocket.disconnect();
      }
      this.isConnected = false;
      console.log('✅ Disconnected from QZ Tray');
    } catch (error) {
      console.error('❌ Error disconnecting from QZ Tray:', error);
    }
  }

  /**
   * Find available printers
   */
  async findPrinters(): Promise<string[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const printers = await qz.printers.find();
      console.log('✅ Printer(s) found:', printers);
      return printers;
    } catch (error: any) {
      console.error('❌ Error finding printers:', error);
      throw new Error(`Failed to find printers: ${error.message || error}`);
    }
  }

  /**
   * Get default printer name
   */
  async getDefaultPrinter(): Promise<string | null> {
    try {
      const printers = await this.findPrinters();
      if (printers.length === 0) {
        return null;
      }
      // Return first printer as default
      return printers[0];
    } catch (error) {
      console.error('❌ Error getting default printer:', error);
      return null;
    }
  }

  /**
   * Print TSPL commands directly to printer via QZ Tray (Production Ready)
   * @param tsplCommands Raw TSPL command string from backend
   * @param printerName Optional printer name (if not provided, uses default)
   */
  async printTSPL(tsplCommands: string, printerName?: string): Promise<void> {
    if (!tsplCommands?.trim()) {
      throw new Error('TSPL commands are empty');
    }

    // Connect to QZ Tray if not already connected
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect();
      this.isConnected = true;
    }

    // Find printers and get target printer
    const printers = await qz.printers.find();
    const printer = printerName ?? printers[0];

    if (!printer) {
      throw new Error('No printer found. Please connect a printer.');
    }

    console.log(`🖨️ Printing to printer: ${printer}`);
    console.log(`📄 TSPL Commands length: ${tsplCommands.length} characters`);

    // Normalize line endings: convert all to \r\n (Windows format)
    let data = tsplCommands
      .replace(/\r\n/g, '\n')  // First normalize \r\n to \n
      .replace(/\r/g, '\n')     // Then normalize \r to \n
      .replace(/\n/g, '\r\n'); // Finally convert all \n to \r\n

    // Ensure TSPL ends with \r\n
    if (!data.endsWith('\r\n')) {
      data += '\r\n';
    }

    console.log(`📄 Normalized TSPL preview:`, data.substring(0, 200));

    // Create print config with encoding: null for raw TSPL printing
    const config = qz.configs.create(printer, {
      encoding: null,  // Important: null encoding for raw TSPL
      copies: 1
    });

    // Send raw TSPL commands to printer
    await qz.print(config, [{
      type: 'raw',
      format: 'command',  // 'command' format for TSPL printers
      data: data
    }]);

    console.log('✅ Printed TSPL from backend');
  }

  /**
   * Check connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected && (this.isQzTrayAvailable() ? qz.websocket.isActive() : false);
  }
}

