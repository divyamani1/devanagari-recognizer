import {
  Component, Input, ElementRef, AfterViewInit, ViewChild
} from '@angular/core';
import { fromEvent } from 'rxjs';
import { switchMap, takeUntil, pairwise } from 'rxjs/operators';
import * as tf from '@tensorflow/tfjs';

@Component({
  selector: 'app-canvas',
  templateUrl: './drawing-canvas.component.html',
  styleUrls: ['./drawing-canvas.component.css']
})

export class DrawingCanvasComponent implements AfterViewInit {

  constructor() { }

  @ViewChild('canvas', {static: false}) public canvas: ElementRef;

  @Input() public width = 256;
  @Input() public height = 256;

  private cx: CanvasRenderingContext2D;

  public predictions: any;
  public isPredicted = false;
  private model: any;

  public charLabels = {
        0: 'क',
        1: 'ख',
        2: 'ग',
        3: 'घ',
        4: 'ङ',
        5: 'च',
        6: 'छ',
        7: 'ज',
        8: 'झ',
        9: 'ञ',
        10: 'ट',
        11: 'ठ',
        12: 'ड',
        13: 'ढ',
        14: 'ण',
        15: 'त',
        16: 'थ',
        17: 'द',
        18: 'ध',
        19: 'न',
        20: 'प',
        21: 'फ',
        22: 'ब',
        23: 'भ',
        24: 'म',
        25: 'य',
        26: 'र',
        27: 'ल',
        28: 'व',
        29: 'श',
        30: 'ष',
        31: 'स',
        32: 'ह',
        33: 'क्ष',
        34: 'त्र',
        35: 'ज्ञ',
        36: '०',
        37: '१',
        38: '२',
        39: '३',
        40: '४',
        41: '५',
        42: '६',
        43: '७',
        44: '८',
        45: '९'
        }

  public ngAfterViewInit() {
    const canvasEl: HTMLCanvasElement = this.canvas.nativeElement;
    this.cx = canvasEl.getContext('2d');

    canvasEl.width = this.width;
    canvasEl.height = this.height;

    this.cx.lineWidth = 30;
    this.cx.lineCap = 'round';
    this.cx.strokeStyle = '#fff';
    this.cx.fillStyle = '#000';
    this.cx.fillRect(0, 0, this.width, this.height);


    this.captureEvents(canvasEl);

  }

  async loadModel() {
    try {
      this.model = await tf.loadLayersModel('../../assets/tfjs-models/model.json');
    } catch ( e ) {
      console.log('model load error...');
    }
  }

  async predict(image: tf.Tensor3D) {
    const output = tf.keep(this.model.predict(image) as tf.Tensor);
    this.isPredicted = true;
    return Array.from(output.dataSync());
  }
  
  private captureEvents(canvasEl: HTMLCanvasElement) {
    fromEvent(canvasEl, 'mousedown')
      .pipe(
        switchMap((e) => {
          return fromEvent(canvasEl, 'mousemove')
            .pipe(
              takeUntil(fromEvent(canvasEl, 'mouseup')),
              takeUntil(fromEvent(canvasEl, 'mouseleave')),
              pairwise()
            )
        })
      )
      .subscribe((res: [MouseEvent, MouseEvent]) => {
        const rect = canvasEl.getBoundingClientRect();
  
        const prevPos = {
          x: res[0].clientX - rect.left,
          y: res[0].clientY - rect.top
        };
  
        const currentPos = {
          x: res[1].clientX - rect.left,
          y: res[1].clientY - rect.top
        };
  
        this.drawOnCanvas(prevPos, currentPos);
      });
  }

  private drawOnCanvas(prevPos: { x: number, y: number }, currentPos: { x: number, y: number }) {
    if (!this.cx) { return; }

    this.cx.beginPath();

    if (prevPos) {
      this.cx.moveTo(prevPos.x, prevPos.y); // from
      this.cx.lineTo(currentPos.x, currentPos.y);
      this.cx.stroke();
    }

  }

  public clearCanvas() {
    this.cx.clearRect(0, 0, this.height, this.width);
    this.cx.fillRect(0, 0, this.width, this.height);
  }


  public async callPredict() {
    
    await this.loadModel();

    const data = this.cx.getImageData(0, 0, this.height, this.width);

    await tf.tidy(() => {
      let img = tf.browser.fromPixels(data, 1);
      
      img = img.reshape([256, 256, 1]);
      const axis = 0;
      img = img.expandDims(axis);
      img = tf.image.resizeNearestNeighbor(img, [32, 32]);
      img = tf.cast(img, 'float32');
      img = img.div(255.0);
      
      this.predict(img).then(predData => {
        this.predictions = predData;
      });
    });

    this.predictions = tf.argMax(this.predictions).dataSync()[0];
    }
}

