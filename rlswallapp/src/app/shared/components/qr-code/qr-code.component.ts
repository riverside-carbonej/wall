import { Component, Input, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-qr-code',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="qr-code-container">
      <canvas #qrCanvas></canvas>
      <div class="qr-label" *ngIf="label">{{ label }}</div>
    </div>
  `,
  styles: [`
    .qr-code-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: var(--md-sys-color-surface-container);
      border-radius: var(--md-sys-shape-corner-medium);
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    .qr-code-container:hover {
      background: var(--md-sys-color-surface-container-high);
      transform: scale(1.02);
    }

    canvas {
      display: block;
      width: 100%;
      height: auto;
      max-width: 150px;
      border-radius: var(--md-sys-shape-corner-small);
    }

    .qr-label {
      font-size: 11px;
      color: var(--md-sys-color-on-surface-variant);
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
  `]
})
export class QrCodeComponent implements AfterViewInit {
  @Input() data: string = '';
  @Input() label: string = '';
  @Input() size: number = 150;
  @ViewChild('qrCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  ngAfterViewInit() {
    this.generateQRCode();
  }

  ngOnChanges() {
    if (this.canvasRef) {
      this.generateQRCode();
    }
  }

  private generateQRCode() {
    if (!this.data || !this.canvasRef) return;

    const canvas = this.canvasRef.nativeElement;
    
    QRCode.toCanvas(canvas, this.data, {
      width: this.size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    }, (error) => {
      if (error) {
        console.error('Error generating QR code:', error);
      }
    });
  }
}