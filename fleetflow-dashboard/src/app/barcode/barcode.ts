import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';

@Component({
  selector: 'app-barcode',
  imports: [CommonModule],
  templateUrl: './barcode.html',
  styleUrl: './barcode.css',
})
export class ScannerComponent implements OnDestroy {

  codeReader = new BrowserMultiFormatReader();
  scannedResult: string = '';

  controls: IScannerControls | null = null;
  selectedDeviceId: string = '';

  async startScanner() {
    try {
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();

      this.selectedDeviceId = devices[0]?.deviceId;

      this.controls = await this.codeReader.decodeFromVideoDevice(
        this.selectedDeviceId,
        'video',
        (result, err, controls) => {

          if (result && !this.scannedResult) {
            this.scannedResult = result.getText();
            console.log('Scanned:', this.scannedResult);

            controls.stop(); // stop scan after success
          }
        }
      );

    } catch (err) {
      console.error('Scanner error:', err);
    }
  }

  stopScanner() {
    this.controls?.stop();
    this.controls = null;
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }
}