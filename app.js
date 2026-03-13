// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
const G = id => document.getElementById(id);

function toast(msg, ms = 2200) {
  const t = G('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), ms);
}

function openMod(id) { G(id).classList.add('open'); }
function closeMod(id) { G(id).classList.remove('open'); }

document.querySelectorAll('.mov').forEach(m =>
  m.addEventListener('click', e => {
    if (e.target === m) m.classList.remove('open');
  })
);


// ═══════════════════════════════════════════════════════════════
// STATE & CONSTANTS
// ═══════════════════════════════════════════════════════════════
let CW = 800, CH = 600;
let Z = 1;
let T = 'brush';
let BS = 12;
let BO = 1;
let FC = '#e05252';
let layers = [];
let AI = 0;
let drawing = false;
let lx = 0, ly = 0, sx = 0, sy = 0;
let bold = false, ital = false;
let dragSt = null, dragOr = null;
let prevSnap = null;
let H = [], HI = -1;

// Selection & Clipboard
let selRect = null;  // {x, y, w, h} - current selection
let selMoving = false;  // true if dragging the selection
let selStartX = 0, selStartY = 0;  // start position when creating selection
let clipboard = null;  // {canvas, w, h, x, y} - copied pixel data
let floatingSel = null;  // {canvas, x, y, w, h} - floating selection being moved
let floatingIsPaste = false;  // true if floatingSel came from a paste (should go to new layer)

// Text tool state
let textBox = null;  // {x, y, w, h} - current text box being drawn
let textBoxEditing = false;  // true if editing text in a box
let textResizing = null;  // 'n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw' - resize direction

const TIDS = ['sel', 'marquee', 'brush', 'erase', 'fill', 'rect', 'ellip', 'line', 'text', 'pick'];
const TNAMES = {
  sel: 'Select', marquee: 'Marquee', brush: 'Brush', erase: 'Eraser', fill: 'Fill',
  rect: 'Rectangle', ellip: 'Ellipse', line: 'Line', text: 'Text', pick: 'Eyedropper'
};
const TCURS = {
  sel: 'move', marquee: 'crosshair', brush: 'crosshair', erase: 'cell', fill: 'crosshair',
  rect: 'crosshair', ellip: 'crosshair', line: 'crosshair', text: 'text', pick: 'crosshair'
};

const disp = G('disp');
const dc = disp.getContext('2d');


// ═══════════════════════════════════════════════════════════════
// CANVAS & LAYERS
// ═══════════════════════════════════════════════════════════════
function initC(w, h) {
  CW = w;
  CH = h;
  disp.width = CW;
  disp.height = CH;
  G('ssz').textContent = `${CW}×${CH}`;
}

function mkLayer(name, type = 'pixel') {
  const c = document.createElement('canvas');
  c.width = CW;
  c.height = CH;
  return {
    name, type, canvas: c, ctx: c.getContext('2d'),
    visible: true, locked: false, opacity: 1, blend: 'normal',
    text: 'Text', ff: 'Arial', fs: 60, fstyle: '', align: 'center', color: '#ffffff',
    tx: CW / 2, ty: CH / 2, tw: 200, th: 100,  // text box dimensions
    img: null, ix: 0, iy: 0, iw: 0, ih: 0,
    px: 0, py: 0  // pixel layer position
  };
}


// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════
function render() {
  dc.clearRect(0, 0, CW, CH);

  for (let y = 0; y < CH; y += 12)
    for (let x = 0; x < CW; x += 12) {
      dc.fillStyle = ((x + y) / 12) % 2 === 0 ? '#ccc' : '#fff';
      dc.fillRect(x, y, 12, 12);
    }

  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i];
    if (!l.visible) continue;
    if (l.type === 'text') drawTxtL(l);
    dc.save();
    dc.globalAlpha = l.opacity;
    dc.globalCompositeOperation = l.blend;
    if (l.type === 'pixel') {
      // Draw pixel layer at its position
      dc.drawImage(l.canvas, l.px || 0, l.py || 0);
    } else if (l.type === 'image') {
      dc.drawImage(l.canvas, l.ix, l.iy);
    } else {
      dc.drawImage(l.canvas, 0, 0);
    }
    dc.restore();
  }

  if (prevSnap) {
    dc.save();
    dc.globalAlpha = 0.85;
    dc.drawImage(prevSnap, 0, 0);
    dc.restore();
  }

  // Draw floating selection (when moving pasted content)
  if (floatingSel) {
    dc.save();
    dc.globalAlpha = 0.85;
    dc.drawImage(floatingSel.canvas, floatingSel.x, floatingSel.y);
    dc.restore();
  }

  // Draw text box being created
  if (textBox && textBox.w > 0 && textBox.h > 0) {
    dc.save();
    dc.strokeStyle = '#5b8cff';
    dc.lineWidth = 2;
    dc.setLineDash([5, 5]);
    dc.strokeRect(textBox.x, textBox.y, textBox.w, textBox.h);
    dc.setLineDash([]);
    dc.fillStyle = '#5b8cff11';
    dc.fillRect(textBox.x, textBox.y, textBox.w, textBox.h);
    dc.restore();
  }

  // Draw selection rectangle
  if (selRect) {
    dc.save();
    // Solid line when moving, dashed when static
    dc.strokeStyle = selMoving ? '#ff6b6b' : '#5b8cff';
    dc.lineWidth = selMoving ? 2 : 2;
    dc.setLineDash(selMoving ? [] : [5, 5]);
    dc.strokeRect(selRect.x, selRect.y, selRect.w, selRect.h);
    dc.setLineDash([]);
    dc.fillStyle = selMoving ? '#ff6b6b22' : '#5b8cff22';
    dc.fillRect(selRect.x, selRect.y, selRect.w, selRect.h);
    // Draw corner handles when not moving
    if (!selMoving && (selRect.w > 10 && selRect.h > 10)) {
      const hs = 6;
      dc.fillStyle = '#fff';
      dc.fillRect(selRect.x - hs/2, selRect.y - hs/2, hs, hs);
      dc.fillRect(selRect.x + selRect.w - hs/2, selRect.y - hs/2, hs, hs);
      dc.fillRect(selRect.x - hs/2, selRect.y + selRect.h - hs/2, hs, hs);
      dc.fillRect(selRect.x + selRect.w - hs/2, selRect.y + selRect.h - hs/2, hs, hs);
    }
    dc.restore();
  }

  refreshPanel();
}

function drawTxtL(l) {
  const lc = l.ctx;
  lc.clearRect(0, 0, CW, CH);
  
  // Get text box dimensions
  const boxW = l.tw || 200;
  const boxH = l.th || 100;
  const boxX = l.tx - boxW / 2;
  const boxY = l.ty - boxH / 2;
  
  // Draw text box border and resize handles when editing
  if (textBoxEditing && AI === layers.indexOf(l)) {
    lc.strokeStyle = '#5b8cff';
    lc.lineWidth = 1;
    lc.setLineDash([5, 5]);
    lc.strokeRect(boxX, boxY, boxW, boxH);
    lc.setLineDash([]);
    
    // Draw resize handles
    const hs = 8;
    lc.fillStyle = '#5b8cff';
    // Corners
    lc.fillRect(boxX - hs/2, boxY - hs/2, hs, hs);
    lc.fillRect(boxX + boxW - hs/2, boxY - hs/2, hs, hs);
    lc.fillRect(boxX - hs/2, boxY + boxH - hs/2, hs, hs);
    lc.fillRect(boxX + boxW - hs/2, boxY + boxH - hs/2, hs, hs);
    // Edges
    lc.fillRect(boxX + boxW/2 - hs/2, boxY - hs/2, hs, hs);
    lc.fillRect(boxX + boxW/2 - hs/2, boxY + boxH - hs/2, hs, hs);
    lc.fillRect(boxX - hs/2, boxY + boxH/2 - hs/2, hs, hs);
    lc.fillRect(boxX + boxW - hs/2, boxY + boxH/2 - hs/2, hs, hs);
  }
  
  // Draw the text with word wrapping
  lc.save();
  lc.font = `${l.fstyle ? l.fstyle + ' ' : ''}${l.fs}px "${l.ff}"`;
  lc.fillStyle = l.color;
  lc.textAlign = l.align || 'left';
  lc.textBaseline = 'top';
  
  const maxW = boxW - 10;
  const words = String(l.text).split(' ');
  let lines = [], line = '';
  for (const w of words) {
    const t2 = line ? line + ' ' + w : w;
    if (lc.measureText(t2).width > maxW && line) { lines.push(line); line = w; }
    else line = t2;
  }
  if (line) lines.push(line);
  
  const lh = l.fs * 1.2;
  let cy = boxY + 5;
  for (const ln of lines) { 
    let cx = boxX + 5;
    if (l.align === 'center') cx = l.tx;
    else if (l.align === 'right') cx = boxX + boxW - 5;
    lc.fillText(ln, cx, cy); 
    cy += lh; 
  }
  lc.restore();
}

function cXY(e) {
  const r = disp.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (CW / r.width),
    y: (e.clientY - r.top) * (CH / r.height)
  };
}


// ═══════════════════════════════════════════════════════════════
// TOOLS
// ═══════════════════════════════════════════════════════════════
function setT(t) {
  T = t;
  TIDS.forEach(id => {
    const el = G('t' + id);
    if (el) el.classList.remove('on');
  });
  const el = G('t' + t);
  if (el) el.classList.add('on');
  G('stool').textContent = TNAMES[t] || t;
  disp.style.cursor = TCURS[t] || 'crosshair';
}

function dot(l, x, y) {
  if (l.type !== 'pixel') return;
  l.ctx.save();
  l.ctx.globalAlpha = BO;
  if (T === 'erase') {
    l.ctx.globalCompositeOperation = 'destination-out';
    l.ctx.fillStyle = 'rgba(0,0,0,1)';
  } else {
    l.ctx.globalCompositeOperation = 'source-over';
    l.ctx.fillStyle = FC;
  }
  l.ctx.beginPath();
  l.ctx.arc(x, y, BS / 2, 0, Math.PI * 2);
  l.ctx.fill();
  l.ctx.restore();
  render();
}

function drawLn(l, x1, y1, x2, y2) {
  if (l.type !== 'pixel') return;
  l.ctx.save();
  l.ctx.globalAlpha = BO;
  if (T === 'erase') {
    l.ctx.globalCompositeOperation = 'destination-out';
    l.ctx.strokeStyle = 'rgba(0,0,0,1)';
  } else {
    l.ctx.globalCompositeOperation = 'source-over';
    l.ctx.strokeStyle = FC;
  }
  l.ctx.lineWidth = BS;
  l.ctx.lineCap = 'round';
  l.ctx.lineJoin = 'round';
  l.ctx.beginPath();
  l.ctx.moveTo(x1, y1);
  l.ctx.lineTo(x2, y2);
  l.ctx.stroke();
  l.ctx.restore();
  render();
}

function drawShape(lc, x1, y1, x2, y2) {
  lc.save();
  lc.strokeStyle = FC;
  lc.fillStyle = FC + '44';
  lc.lineWidth = Math.max(1, BS * 0.3);
  lc.lineCap = 'round';
  lc.beginPath();
  if (T === 'rect') { lc.rect(x1, y1, x2 - x1, y2 - y1); lc.fill(); lc.stroke(); }
  else if (T === 'ellip') {
    lc.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2);
    lc.fill();
    lc.stroke();
  }
  else if (T === 'line') { lc.moveTo(x1, y1); lc.lineTo(x2, y2); lc.stroke(); }
  lc.restore();
}


// ═══════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════
disp.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  const p = cXY(e);
  drawing = true;
  lx = p.x;
  ly = p.y;
  sx = p.x;
  sy = p.y;
  const l = layers[AI];
  if (!l) return;

  if (T === 'sel') {
    dragSt = { x: e.clientX, y: e.clientY };
    dragOr = { tx: l.tx, ty: l.ty, ix: l.ix, iy: l.iy, px: l.px || 0, py: l.py || 0 };
    return;
  }

  if (T === 'marquee') {
    const hasSel = selRect && selRect.w > 2 && selRect.h > 2;
    const inSel = hasSel && p.x >= selRect.x && p.x <= selRect.x + selRect.w && 
                  p.y >= selRect.y && p.y <= selRect.y + selRect.h;
    
    if (inSel && floatingSel) {
      // Clicking inside floating selection (paste or move) - start moving it
      selMoving = true;
      dragSt = { x: p.x, y: p.y };
      dragOr = { x: floatingSel.x, y: floatingSel.y };
    } else if (inSel && !floatingSel) {
      // Clicking inside static selection - create floating from canvas and move
      selMoving = true;
      dragSt = { x: p.x, y: p.y };
      dragOr = { x: selRect.x, y: selRect.y };
      // Create floating selection from canvas
      const x = Math.round(selRect.x);
      const y = Math.round(selRect.y);
      const w = Math.round(selRect.w);
      const h = Math.round(selRect.h);
      const tmp = document.createElement('canvas');
      tmp.width = w;
      tmp.height = h;
      tmp.getContext('2d').drawImage(l.canvas, x, y, w, h, 0, 0, w, h);
      floatingSel = { canvas: tmp, x: x, y: y, w: w, h: h };
      // Clear the area on canvas
      l.ctx.save();
      l.ctx.globalCompositeOperation = 'destination-out';
      l.ctx.fillRect(x, y, w, h);
      l.ctx.restore();
    } else {
      // Click outside - create new selection
      selRect = { x: p.x, y: p.y, w: 0, h: 0 };
      selStartX = p.x;
      selStartY = p.y;
      sx = p.x;
      sy = p.y;
      selMoving = false;
      floatingSel = null;
    }
    drawing = true;
    return;
  }

  if (T === 'pick') {
    const px = dc.getImageData(Math.round(p.x), Math.round(p.y), 1, 1).data;
    if (px[3] > 0) {
      FC = '#' + [px[0], px[1], px[2]].map(v => v.toString(16).padStart(2, '0')).join('');
      G('cpick').value = FC;
      G('fgsw').style.background = FC;
      toast('Color: ' + FC);
    }
    drawing = false;
    return;
  }

  if (T === 'text') {
    const l = layers[AI];
    if (l && l.type === 'text' && AI === layers.indexOf(l)) {
      // Check if clicking on resize handle OR in middle for moving
      const boxW = l.tw || 200;
      const boxH = l.th || 100;
      const boxX = l.tx - boxW / 2;
      const boxY = l.ty - boxH / 2;
      const hs = 8; // handle size - smaller = harder to trigger resize
      
      // Check if inside the box (for moving)
      const inBox = p.x > boxX + hs && p.x < boxX + boxW - hs && 
                   p.y > boxY + hs && p.y < boxY + boxH - hs;
      
      // If in middle, don't resize - move instead
      if (inBox) {
        // Start moving
        textBoxEditing = true;
        dragSt = { x: e.clientX, y: e.clientY };
        dragOr = { tx: l.tx, ty: l.ty };
        drawing = true;
        setTimeout(() => G('txted').focus(), 50);
        render();
        return;
      }
      
      // Helper to check if point is near an edge
      const onEdge = (val, edge) => Math.abs(val - edge) < hs;
      
      // Check corners first (more specific)
      const onLeft = onEdge(p.x, boxX);
      const onRight = onEdge(p.x, boxX + boxW);
      const onTop = onEdge(p.y, boxY);
      const onBottom = onEdge(p.y, boxY + boxH);
      
      let resizeDir = null;
      
      // Corners
      if (onLeft && onTop) resizeDir = 'nw';
      else if (onRight && onTop) resizeDir = 'ne';
      else if (onLeft && onBottom) resizeDir = 'sw';
      else if (onRight && onBottom) resizeDir = 'se';
      // Edges
      else if (onTop) resizeDir = 'n';
      else if (onBottom) resizeDir = 's';
      else if (onLeft) resizeDir = 'w';
      else if (onRight) resizeDir = 'e';
      
      if (resizeDir) {
        textBoxEditing = true;
        textResizing = resizeDir;
        dragSt = { x: p.x, y: p.y, tw: boxW, th: boxH, tx: l.tx, ty: l.ty };
        drawing = true;
        return;
      }
    }
    
    // If clicking on existing text layer box, start editing or moving
    const clickedText = layers.find(txt => 
      txt.type === 'text' && 
      p.x >= txt.tx - txt.tw/2 && p.x <= txt.tx + txt.tw/2 &&
      p.y >= txt.ty - txt.th/2 && p.y <= txt.ty + txt.th/2
    );
    
    if (clickedText) {
      const idx = layers.indexOf(clickedText);
      if (idx !== AI) { AI = idx; render(); }
      // Enable editing mode and start dragging
      textBoxEditing = true;
      dragSt = { x: e.clientX, y: e.clientY };
      dragOr = { tx: clickedText.tx, ty: clickedText.ty };
      drawing = true;
      // Focus text input
      setTimeout(() => G('txted').focus(), 50);
      render();
      return;
    }
    
    // Clicking elsewhere - start creating a new text box
    textBoxEditing = false;
    textBox = { x: p.x, y: p.y, w: 0, h: 0 };
    selStartX = p.x;
    selStartY = p.y;
    drawing = true;
    return;
  }

  if (T === 'fill') {
    if (l.type !== 'pixel') { toast('Select a pixel layer'); drawing = false; return; }
    floodFill(l, Math.round(p.x), Math.round(p.y));
    saveH();
    render();
    drawing = false;
    return;
  }
  if (T === 'brush' || T === 'erase') {
    dot(l, p.x, p.y);
  }
});

disp.addEventListener('mousemove', e => {
  const p = cXY(e);
  G('xyc').textContent = `${Math.round(p.x)}, ${Math.round(p.y)}`;
  if (!drawing) return;
  const l = layers[AI];
  if (!l) return;

  if (T === 'sel') {
    const dx = (e.clientX - dragSt.x) / Z;
    const dy = (e.clientY - dragSt.y) / Z;
    if (l.type === 'text') { l.tx = dragOr.tx + dx; l.ty = dragOr.ty + dy; }
    else if (l.type === 'image') {
      l.ix = dragOr.ix + dx;
      l.iy = dragOr.iy + dy;
      l.ctx.clearRect(0, 0, CW, CH);
      l.ctx.drawImage(l.img, l.ix, l.iy, l.iw, l.ih);
    }
    else if (l.type === 'pixel') {
      // Move pixel layer by updating position
      l.px = dragOr.px + dx;
      l.py = dragOr.py + dy;
    }
    render();
    return;
  }

  // Text tool - create box, drag text, or resize
  if (T === 'text') {
    if (textBox) {
      // Creating text box
      textBox.x = Math.min(selStartX, p.x);
      textBox.y = Math.min(selStartY, p.y);
      textBox.w = Math.abs(p.x - selStartX);
      textBox.h = Math.abs(p.y - selStartY);
    } else if (textResizing) {
      // Resizing text box - anchor opposite corner
      const l = layers[AI];
      if (l && l.type === 'text') {
        const origW = dragSt.tw;
        const origH = dragSt.th;
        const origX = dragSt.tx;
        const origY = dragSt.ty;
        
        // Calculate edges
        const left = origX - origW / 2;
        const right = origX + origW / 2;
        const top = origY - origH / 2;
        const bottom = origY + origH / 2;
        
        let newW = origW, newH = origH, newX = origX, newY = origY;
        
        if (textResizing === 'se') {
          // Bottom-right: anchor top-left
          newW = Math.max(50, p.x - left);
          newH = Math.max(30, p.y - top);
          newX = left + newW / 2;
          newY = top + newH / 2;
        } else if (textResizing === 'sw') {
          // Bottom-left: anchor top-right
          newW = Math.max(50, right - p.x);
          newH = Math.max(30, p.y - top);
          newX = right - newW / 2;
          newY = top + newH / 2;
        } else if (textResizing === 'ne') {
          // Top-right: anchor bottom-left
          newW = Math.max(50, p.x - left);
          newH = Math.max(30, bottom - p.y);
          newX = left + newW / 2;
          newY = bottom - newH / 2;
        } else if (textResizing === 'nw') {
          // Top-left: anchor bottom-right
          newW = Math.max(50, right - p.x);
          newH = Math.max(30, bottom - p.y);
          newX = right - newW / 2;
          newY = bottom - newH / 2;
        } else if (textResizing === 'e') {
          // Right edge: anchor left
          newW = Math.max(50, p.x - left);
          newX = left + newW / 2;
        } else if (textResizing === 'w') {
          // Left edge: anchor right
          newW = Math.max(50, right - p.x);
          newX = right - newW / 2;
        } else if (textResizing === 's') {
          // Bottom edge: anchor top
          newH = Math.max(30, p.y - top);
          newY = top + newH / 2;
        } else if (textResizing === 'n') {
          // Top edge: anchor bottom
          newH = Math.max(30, bottom - p.y);
          newY = bottom - newH / 2;
        }
        
        l.tw = newW;
        l.th = newH;
        l.tx = newX;
        l.ty = newY;
      }
    } else if (drawing && dragOr && dragOr.tx !== undefined) {
      // Moving existing text layer
      const dx = (e.clientX - dragSt.x) / Z;
      const dy = (e.clientY - dragSt.y) / Z;
      const l = layers[AI];
      if (l && l.type === 'text') {
        l.tx = dragOr.tx + dx;
        l.ty = dragOr.ty + dy;
      }
    }
    render();
    return;
  }

  if (T === 'marquee' && drawing) {
    if (selMoving) {
      // Moving the floating selection
      const dx = p.x - dragSt.x;
      const dy = p.y - dragSt.y;
      if (floatingSel) {
        floatingSel.x = dragOr.x + dx;
        floatingSel.y = dragOr.y + dy;
        selRect.x = floatingSel.x;
        selRect.y = floatingSel.y;
      } else {
        selRect.x = dragOr.x + dx;
        selRect.y = dragOr.y + dy;
      }
    } else {
      // Creating new selection
      selRect.x = Math.min(selStartX, p.x);
      selRect.y = Math.min(selStartY, p.y);
      selRect.w = Math.abs(p.x - selStartX);
      selRect.h = Math.abs(p.y - selStartY);
    }
    render();
    return;
  }

  if (l.locked || !l.visible) return;
  if (T === 'brush' || T === 'erase') {
    drawLn(l, lx, ly, p.x, p.y);
    lx = p.x;
    ly = p.y;
  } else if (T === 'rect' || T === 'ellip' || T === 'line') {
    const tmp = document.createElement('canvas');
    tmp.width = CW;
    tmp.height = CH;
    drawShape(tmp.getContext('2d'), sx, sy, p.x, p.y);
    prevSnap = tmp;
    render();
  }
});

disp.addEventListener('mouseup', e => {
  const wasDrawing = drawing;
  drawing = false;
  const p = cXY(e);
  const l = layers[AI];
  prevSnap = null;

  // Finalize text box - create text layer
  if (T === 'text' && textBox) {
    textBox.x = Math.min(selStartX, p.x);
    textBox.y = Math.min(selStartY, p.y);
    textBox.w = Math.abs(p.x - selStartX);
    textBox.h = Math.abs(p.y - selStartY);
    
    if (textBox.w > 10 && textBox.h > 10) {
      // Create new text layer
      const nl = mkLayer('Text', 'text');
      nl.text = '';
      nl.tx = textBox.x + textBox.w / 2;
      nl.ty = textBox.y + textBox.h / 2;
      nl.tw = textBox.w;
      nl.th = textBox.h;
      nl.ff = G('tff').value || 'Arial';
      nl.fs = parseInt(G('tfsz').value) || 60;
      nl.color = G('tcol').value || '#ffffff';
      nl.align = 'left';
      layers.unshift(nl);
      AI = 0;
      saveH();
      textBoxEditing = true;
      textBox = null;
      // Focus text input for editing
      setTimeout(() => G('txted').focus(), 50);
      render();
      return;
    } else {
      textBox = null;
      render();
      return;
    }
  }

  // Stop dragging or resizing text layer
  if (T === 'text' && (drawing && dragOr && dragOr.tx !== undefined) || textResizing) {
    if (textResizing) {
      textResizing = null;
    }
    saveH();
  }

  // Finalize selection rectangle for marquee tool
  if (T === 'marquee' && selRect) {
    if (selMoving && floatingSel) {
      // Was moving floating selection - commit
      if (floatingIsPaste) {
        // Paste goes onto its own new layer
        commitPasteAsLayer();
      } else {
        l.ctx.drawImage(floatingSel.canvas, floatingSel.x, floatingSel.y);
        saveH();
        floatingSel = null;
        floatingIsPaste = false;
        selMoving = false;
      }
      render();
      return;
    }
    // Creating new selection
    selRect.x = Math.min(selStartX, p.x);
    selRect.y = Math.min(selStartY, p.y);
    selRect.w = Math.abs(p.x - selStartX);
    selRect.h = Math.abs(p.y - selStartY);
    if (selRect.w > 2 || selRect.h > 2) {
      render();
      return;
    } else {
      selRect = null;
      render();
      return;
    }
  }

  // Click elsewhere with floating selection commits it
  if (floatingSel && l && l.type === 'pixel') {
    if (floatingIsPaste) {
      commitPasteAsLayer();
    } else {
      l.ctx.drawImage(floatingSel.canvas, floatingSel.x, floatingSel.y);
      saveH();
      floatingSel = null;
      floatingIsPaste = false;
      selRect = null;
      selMoving = false;
    }
    render();
  }

  if (!l || l.locked) return;

  // Save history after moving with select tool
  if (T === 'sel' && dragSt) {
    saveH();
  }

  if (T === 'rect' || T === 'ellip' || T === 'line') {
    if (l.type !== 'pixel') { toast('Select a pixel layer'); render(); return; }
    drawShape(l.ctx, sx, sy, p.x, p.y);
    saveH();
    render();
  } else if (T === 'brush' || T === 'erase') {
    saveH();
  }
});

disp.addEventListener('mouseleave', () => {
  if (drawing) { drawing = false; prevSnap = null; }
});

disp.addEventListener('contextmenu', e => {
  e.preventDefault();
  showCtx(e);
});

document.addEventListener('keydown', e => {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  const k = e.key.toLowerCase();
  if (e.ctrlKey || e.metaKey) {
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo(); }
    else if (k === 'c') { e.preventDefault(); copySelection(); }
    else if (k === 'x') { e.preventDefault(); cutSelection(); }
    else if (k === 'v') { e.preventDefault(); pasteSelection(); }
    else if (k === 'e' && !e.shiftKey) { e.preventDefault(); exportPNG(); }
    else if (k === 'e' && e.shiftKey) { e.preventDefault(); flattenAll(); }
    else if (k === 'n') { e.preventDefault(); newCanvas(); }
    else if (k === '=' || k === '+') { e.preventDefault(); setZoom(Z * 1.25); }
    else if (k === '-') { e.preventDefault(); setZoom(Z / 1.25); }
    else if (k === '0') { e.preventDefault(); fitScreen(); }
  } else {
    const map = { v: 'sel', m: 'marquee', b: 'brush', e: 'erase', g: 'fill', r: 'rect', o: 'ellip', l: 'line', i: 'pick' };
    if (map[k]) setT(map[k]);
    else if (k === 't') setT('text');
    else if (k === 'delete' || k === 'backspace') delLayer();
    else if (k === '[') { BS = Math.max(1, BS - 2); G('bsz').value = BS; }
    else if (k === ']') { BS = Math.min(300, BS + 2); G('bsz').value = BS; }
    else if (k === 'escape') { 
      // Commit floating selection if exists
      if (floatingSel) {
        if (floatingIsPaste) {
          commitPasteAsLayer();
        } else {
          const l = layers[AI];
          if (l && l.type === 'pixel') {
            l.ctx.drawImage(floatingSel.canvas, floatingSel.x, floatingSel.y);
            saveH();
          }
          floatingSel = null;
          floatingIsPaste = false;
        }
      }
      selRect = null; 
      selMoving = false;
      textBoxEditing = false;
      render(); 
    }
    else if (k === 'tab') {
      e.preventDefault();
      if (e.shiftKey) {
        AI = AI > 0 ? AI - 1 : layers.length - 1;
      } else {
        AI = AI < layers.length - 1 ? AI + 1 : 0;
      }
      render();
    }
  }
});


// ═══════════════════════════════════════════════════════════════
// HISTORY (UNDO/REDO)
// ═══════════════════════════════════════════════════════════════
function saveH() {
  if (HI < H.length - 1) H = H.slice(0, HI + 1);
  const snap = layers.map(l => ({
    name: l.name, type: l.type, visible: l.visible, locked: l.locked,
    opacity: l.opacity, blend: l.blend, data: l.canvas.toDataURL(),
    text: l.text, ff: l.ff, fs: l.fs, fstyle: l.fstyle, align: l.align, color: l.color,
    tx: l.tx, ty: l.ty, tw: l.tw || 200, th: l.th || 100,
    ix: l.ix, iy: l.iy, iw: l.iw, ih: l.ih,
    px: l.px || 0, py: l.py || 0,
    imgSrc: l.img ? l.img.src : null
  }));
  H.push({ layers: snap, AI });
  if (H.length > 30) H.shift();
  HI = H.length - 1;
}

function restoreSnap(snap) {
  let pend = snap.layers.length;
  const nl = new Array(pend);
  snap.layers.forEach((s, i) => {
    const l = mkLayer(s.name, s.type);
    Object.assign(l, {
      visible: s.visible, locked: s.locked, opacity: s.opacity, blend: s.blend,
      text: s.text, ff: s.ff, fs: s.fs, fstyle: s.fstyle, align: s.align, color: s.color,
      tx: s.tx, ty: s.ty, tw: s.tw || 200, th: s.th || 100,
      ix: s.ix, iy: s.iy, iw: s.iw, ih: s.ih,
      px: s.px || 0, py: s.py || 0
    });
    if (s.imgSrc) { const img = new Image(); img.src = s.imgSrc; l.img = img; }
    const img = new Image();
    img.onload = () => {
      l.ctx.clearRect(0, 0, CW, CH);
      l.ctx.drawImage(img, 0, 0);
      nl[i] = l;
      if (--pend === 0) { layers = nl; AI = snap.AI; render(); }
    };
    img.src = s.data;
  });
}

function undo() {
  if (HI > 0) { HI--; restoreSnap(H[HI]); toast('Undo'); }
  else toast('Nothing to undo');
}

function redo() {
  if (HI < H.length - 1) { HI++; restoreSnap(H[HI]); toast('Redo'); }
  else toast('Nothing to redo');
}


// ═══════════════════════════════════════════════════════════════
// LAYER OPERATIONS
// ═══════════════════════════════════════════════════════════════
function addPixelLayer() {
  const l = mkLayer('Layer ' + (layers.length + 1), 'pixel');
  layers.unshift(l);
  AI = 0;
  saveH();
  render();
  toast('New layer added');
}

function openTxtModal() { openMod('txmod'); }

function doAddText() {
  const l = mkLayer('"' + G('txtin').value.slice(0, 14) + '"', 'text');
  l.text = G('txtin').value || 'Text';
  l.ff = G('mff').value;
  l.fs = +G('mfsz').value;
  l.color = G('mtc').value;
  l.fstyle = G('mstyle').value;
  l.align = G('malign').value;
  l.tx = CW / 2;
  l.ty = CH / 2;
  layers.unshift(l);
  AI = 0;
  closeMod('txmod');
  saveH();
  render();
  toast('Text layer added');
}

function addImgLayer(input) {
  const f = input.files[0];
  if (!f) return;
  const url = URL.createObjectURL(f);
  const img = new Image();
  img.onload = () => {
    const l = mkLayer(f.name.slice(0, 18), 'image');
    const sc = Math.min(1, CW / img.width, CH / img.height);
    l.iw = img.width * sc;
    l.ih = img.height * sc;
    l.ix = (CW - l.iw) / 2;
    l.iy = (CH - l.ih) / 2;
    l.img = img;
    l.ctx.drawImage(img, l.ix, l.iy, l.iw, l.ih);
    layers.unshift(l);
    AI = 0;
    saveH();
    render();
    toast('Image layer added');
  };
  img.src = url;
  input.value = '';
}

function delLayer() {
  if (layers.length <= 1) { toast('Cannot delete last layer'); return; }
  layers.splice(AI, 1);
  AI = Math.min(AI, layers.length - 1);
  saveH();
  render();
  toast('Layer deleted');
}

function dupLayer() {
  const l = layers[AI];
  if (!l) return;
  const nl = mkLayer(l.name + ' copy', l.type);
  Object.assign(nl, {
    visible: l.visible, opacity: l.opacity, blend: l.blend,
    text: l.text, ff: l.ff, fs: l.fs, fstyle: l.fstyle, align: l.align, color: l.color,
    tx: l.tx + 20, ty: l.ty + 20, ix: l.ix + 10, iy: l.iy + 10, iw: l.iw, ih: l.ih, img: l.img
  });
  nl.ctx.drawImage(l.canvas, 0, 0);
  layers.splice(AI, 0, nl);
  saveH();
  render();
  toast('Duplicated');
}

function layUp() {
  if (AI <= 0) return;
  [layers[AI], layers[AI - 1]] = [layers[AI - 1], layers[AI]];
  AI--;
  saveH();
  render();
}

function layDn() {
  if (AI >= layers.length - 1) return;
  [layers[AI], layers[AI + 1]] = [layers[AI + 1], layers[AI]];
  AI++;
  saveH();
  render();
}

function mergeDown() {
  if (AI >= layers.length - 1) { toast('No layer below'); return; }
  const top = layers[AI], bot = layers[AI + 1];
  if (top.type === 'text') drawTxtL(top);
  bot.ctx.save();
  bot.ctx.globalAlpha = top.opacity;
  bot.ctx.globalCompositeOperation = top.blend;
  bot.ctx.drawImage(top.canvas, 0, 0);
  bot.ctx.restore();
  layers.splice(AI, 1);
  AI = Math.min(AI, layers.length - 1);
  saveH();
  render();
  toast('Merged');
}

function flattenAll() {
  const tmp = document.createElement('canvas');
  tmp.width = CW;
  tmp.height = CH;
  tmp.getContext('2d').drawImage(disp, 0, 0);
  const l = mkLayer('Background', 'pixel');
  l.ctx.drawImage(tmp, 0, 0);
  layers = [l];
  AI = 0;
  saveH();
  render();
  toast('Flattened');
}

function setOpac(v) {
  G('lopv').textContent = v;
  const l = layers[AI];
  if (l) { l.opacity = v / 100; render(); }
}

function setBlend() {
  const l = layers[AI];
  if (l) { l.blend = G('lblend').value; render(); }
}


// ═══════════════════════════════════════════════════════════════
// CLIPBOARD (COPY/CUT/PASTE)
// ═══════════════════════════════════════════════════════════════
function commitPasteAsLayer() {
  if (!floatingSel) return;
  // Create a full-canvas-size layer and stamp the paste at its current position
  const nl = mkLayer('Pasted Layer', 'pixel');
  nl.ctx.drawImage(floatingSel.canvas, floatingSel.x, floatingSel.y);
  layers.unshift(nl);
  AI = 0;
  floatingSel = null;
  floatingIsPaste = false;
  selRect = null;
  selMoving = false;
  saveH();
  render();
  toast('Pasted as new layer!');
}
function copySelection() {
  const l = layers[AI];
  if (!l || l.type !== 'pixel') { toast('Select a pixel layer'); return; }
  if (!selRect || selRect.w < 2 || selRect.h < 2) { toast('Make a selection first (Marquee tool)'); return; }

  const x = Math.round(selRect.x);
  const y = Math.round(selRect.y);
  const w = Math.round(selRect.w);
  const h = Math.round(selRect.h);

  const tmp = document.createElement('canvas');
  tmp.width = w;
  tmp.height = h;
  const tc = tmp.getContext('2d');

  // Copy from floating selection if exists, otherwise from canvas
  if (floatingSel) {
    // Calculate offset from floating selection
    const fx = Math.max(0, x - floatingSel.x);
    const fy = Math.max(0, y - floatingSel.y);
    const fw = Math.min(w, floatingSel.w - fx);
    const fh = Math.min(h, floatingSel.h - fy);
    if (fw > 0 && fh > 0) {
      tc.drawImage(floatingSel.canvas, fx, fy, fw, fh, 0, 0, fw, fh);
    }
  } else {
    tc.drawImage(l.canvas, x, y, w, h, 0, 0, w, h);
  }

  clipboard = { canvas: tmp, w, h, x, y };
  toast('Copied!');
}

function cutSelection() {
  const l = layers[AI];
  if (!l || l.type !== 'pixel') { toast('Select a pixel layer'); return; }
  if (!selRect || selRect.w < 2 || selRect.h < 2) { toast('Make a selection first'); return; }

  copySelection();

  // Clear the area - either floating selection or canvas
  const x = Math.round(selRect.x);
  const y = Math.round(selRect.y);
  const w = Math.round(selRect.w);
  const h = Math.round(selRect.h);

  if (floatingSel) {
    // Clear from floating selection
    const fc = floatingSel.canvas.getContext('2d');
    fc.save();
    fc.globalCompositeOperation = 'destination-out';
    fc.fillRect(x - floatingSel.x, y - floatingSel.y, w, h);
    fc.restore();
  }

  l.ctx.save();
  l.ctx.globalCompositeOperation = 'destination-out';
  l.ctx.fillRect(x, y, w, h);
  l.ctx.restore();

  saveH();
  render();
  toast('Cut!');
}

function pasteSelection() {
  if (!clipboard) { toast('Nothing to paste'); return; }

  const cx = Math.round(CW / 2 - clipboard.w / 2);
  const cy = Math.round(CH / 2 - clipboard.h / 2);

  // Clone the clipboard canvas so we don't mutate it
  const tmp = document.createElement('canvas');
  tmp.width = clipboard.w;
  tmp.height = clipboard.h;
  tmp.getContext('2d').drawImage(clipboard.canvas, 0, 0);

  // Create floating selection (will become its own layer on commit)
  floatingSel = { canvas: tmp, x: cx, y: cy, w: clipboard.w, h: clipboard.h };
  floatingIsPaste = true;

  selRect = { x: cx, y: cy, w: clipboard.w, h: clipboard.h };
  selMoving = false;
  dragSt = null;
  dragOr = null;

  // Switch to marquee tool so the user can immediately drag the paste
  setT('marquee');

  render();
  toast('Pasted on new layer! Drag to position, then click outside to commit');
}


// ═══════════════════════════════════════════════════════════════
// TEXT EDITING
// ═══════════════════════════════════════════════════════════════
function syncTL() {
  const l = layers[AI];
  if (!l || l.type !== 'text') return;
  l.ff = G('tff').value;
  l.fs = +G('tfsz').value;
  l.color = G('tcol').value;
  l.fstyle = (bold ? 'bold ' : '') + (ital ? 'italic' : '');
  render();
}

function editTxt() {
  const l = layers[AI];
  if (l && l.type === 'text') { l.text = G('txted').value; render(); }
}

function tBold() {
  bold = !bold;
  G('tbold').classList.toggle('on', bold);
  syncTL();
}

function tItal() {
  ital = !ital;
  G('tital').classList.toggle('on', ital);
  syncTL();
}


// ═══════════════════════════════════════════════════════════════
// PANEL UI
// ═══════════════════════════════════════════════════════════════
function refreshPanel() {
  const list = G('llist');
  list.innerHTML = '';
  G('lcnt').textContent = layers.length;
  G('slay').textContent = 'Layers: ' + layers.length;

  layers.forEach((l, i) => {
    const div = document.createElement('div');
    div.className = 'li' + (i === AI ? ' on' : '');
    div.onclick = () => { AI = i; render(); };
    div.oncontextmenu = e => { e.preventDefault(); AI = i; render(); showCtx(e); };

    const th = document.createElement('div');
    th.className = 'lth';
    const tc = document.createElement('canvas');
    tc.width = 30;
    tc.height = 30;
    tc.getContext('2d').drawImage(l.canvas, 0, 0, l.canvas.width, l.canvas.height, 0, 0, 30, 30);
    th.appendChild(tc);

    const inf = document.createElement('div');
    inf.className = 'linf';
    inf.innerHTML = `<div class="lnm">${l.name}</div><div class="ltp">${l.type}</div>`;

    const ct = document.createElement('div');
    ct.className = 'lctr';
    const eye = document.createElement('div');
    eye.className = 'lbt' + (l.visible ? '' : ' off');
    eye.textContent = '👁';
    eye.onclick = e => { e.stopPropagation(); l.visible = !l.visible; render(); };
    ct.appendChild(eye);

    div.appendChild(ct);
    div.appendChild(th);
    div.appendChild(inf);
    list.appendChild(div);
  });

  const l = layers[AI];
  if (l) {
    G('lopac').value = Math.round(l.opacity * 100);
    G('lopv').textContent = Math.round(l.opacity * 100);
    G('lblend').value = l.blend;
    const isTxt = l.type === 'text';
    G('txpnl').style.display = isTxt ? 'block' : 'none';
    G('ttbar').style.display = isTxt ? 'flex' : 'none';
    if (isTxt) {
      G('txted').value = l.text;
      G('tff').value = l.ff;
      G('tfsz').value = l.fs;
      G('tfszSlider').value = Math.min(200, l.fs);
      G('tcol').value = l.color;
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// ZOOM
// ═══════════════════════════════════════════════════════════════
function setZoom(z) {
  Z = Math.max(0.05, Math.min(30, z));
  G('cwrap').style.transform = `scale(${Z})`;
  G('zlbl').textContent = Math.round(Z * 100) + '%';
}

function fitScreen() {
  const a = G('carea');
  setZoom(Math.min(a.clientWidth / CW, a.clientHeight / CH) * 0.90);
}

G('carea').addEventListener('wheel', e => {
  e.preventDefault();
  setZoom(Z * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
}, { passive: false });


// ═══════════════════════════════════════════════════════════════
// FILE OPERATIONS
// ═══════════════════════════════════════════════════════════════
function newCanvas() { openMod('ncmod'); }

function doNewCanvas() {
  const w = +G('ncw').value || 800, h = +G('nch').value || 600, bg = G('ncbg').value;
  initC(w, h);
  layers = [];
  const bl = mkLayer('Background', 'pixel');
  if (bg === 'white') { bl.ctx.fillStyle = '#fff'; bl.ctx.fillRect(0, 0, w, h); }
  else if (bg === 'black') { bl.ctx.fillStyle = '#000'; bl.ctx.fillRect(0, 0, w, h); }
  layers.push(bl);
  layers.unshift(mkLayer('Layer 1', 'pixel'));
  AI = 0;
  closeMod('ncmod');
  saveH();
  render();
  fitScreen();
  toast(`${w}×${h} canvas`);
}

function openFile(input) {
  const f = input.files[0];
  if (!f) return;
  const url = URL.createObjectURL(f);
  const img = new Image();
  img.onload = () => {
    initC(img.width, img.height);
    layers = [];
    const bl = mkLayer(f.name.slice(0, 20), 'image');
    bl.iw = CW;
    bl.ih = CH;
    bl.img = img;
    bl.ctx.drawImage(img, 0, 0);
    layers.push(bl);
    layers.unshift(mkLayer('Layer 1', 'pixel'));
    AI = 0;
    saveH();
    render();
    fitScreen();
    toast('Image opened');
  };
  img.src = url;
  input.value = '';
}

function dropFile(e) {
  e.preventDefault();
  G('carea').style.outline = '';
  const f = [...e.dataTransfer.files].find(f => f.type.startsWith('image/'));
  if (!f) return;
  const url = URL.createObjectURL(f);
  const img = new Image();
  img.onload = () => {
    const l = mkLayer(f.name.slice(0, 16), 'image');
    const sc = Math.min(1, CW / img.width, CH / img.height);
    l.iw = img.width * sc;
    l.ih = img.height * sc;
    l.ix = (CW - l.iw) / 2;
    l.iy = (CH - l.ih) / 2;
    l.img = img;
    l.ctx.drawImage(img, l.ix, l.iy, l.iw, l.ih);
    layers.unshift(l);
    AI = 0;
    saveH();
    render();
    toast('Image dropped');
  };
  img.src = url;
}

function exportPNG() {
  const a = document.createElement('a');
  a.download = 'pixelforge.png';
  a.href = disp.toDataURL();
  a.click();
  toast('Exported PNG');
}

function exportJPG() {
  const a = document.createElement('a');
  a.download = 'pixelforge.jpg';
  a.href = disp.toDataURL('image/jpeg', 0.95);
  a.click();
  toast('Exported JPEG');
}


// ═══════════════════════════════════════════════════════════════
// IMAGE ADJUSTMENTS
// ═══════════════════════════════════════════════════════════════
function getPL() {
  const l = layers[AI];
  if (!l || l.type !== 'pixel') { toast('Select a pixel layer'); return null; }
  return l;
}

function pixOp(fn) {
  const l = getPL();
  if (!l) return;
  const id = l.ctx.getImageData(0, 0, CW, CH);
  fn(id.data);
  l.ctx.putImageData(id, 0, 0);
  saveH();
  render();
}

function doGray() {
  pixOp(d => {
    for (let i = 0; i < d.length; i += 4) {
      const g = d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114;
      d[i] = d[i + 1] = d[i + 2] = g;
    }
  });
  toast('Grayscale');
}

function doInvert() {
  pixOp(d => {
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 1) continue;
      d[i] = 255 - d[i];
      d[i + 1] = 255 - d[i + 1];
      d[i + 2] = 255 - d[i + 2];
    }
  });
  toast('Inverted');
}

function doSepia() {
  pixOp(d => {
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      d[i] = Math.min(255, r * .393 + g * .769 + b * .189);
      d[i + 1] = Math.min(255, r * .349 + g * .686 + b * .168);
      d[i + 2] = Math.min(255, r * .272 + g * .534 + b * .131);
    }
  });
  toast('Sepia');
}

function doBC() {
  const br = +G('bsl').value, co = +G('csl').value;
  const f = (259 * (co + 255)) / (255 * (259 - co));
  pixOp(d => {
    for (let i = 0; i < d.length; i += 4)
      for (let c = 0; c < 3; c++) {
        let v = d[i + c] + br;
        v = f * (v - 128) + 128;
        d[i + c] = Math.max(0, Math.min(255, v));
      }
  });
  closeMod('bmod');
  toast('Brightness/Contrast');
}

function doBlur() {
  const l = getPL();
  if (!l) return;
  l.ctx.filter = 'blur(3px)';
  const tmp = document.createElement('canvas');
  tmp.width = CW;
  tmp.height = CH;
  tmp.getContext('2d').drawImage(l.canvas, 0, 0);
  l.ctx.clearRect(0, 0, CW, CH);
  l.ctx.drawImage(tmp, 0, 0);
  l.ctx.filter = 'none';
  saveH();
  render();
  toast('Blur applied');
}

function doSharpen() {
  const l = getPL();
  if (!l) return;
  const id = l.ctx.getImageData(0, 0, CW, CH);
  const k = [0, -1, 0, -1, 5, -1, 0, -1, 0], src = new Uint8ClampedArray(id.data), W = CW;
  for (let y = 1; y < CH - 1; y++)
    for (let x = 1; x < W - 1; x++)
      for (let c = 0; c < 3; c++) {
        let v = 0;
        for (let ky = -1; ky <= 1; ky++)
          for (let kx = -1; kx <= 1; kx++)
            v += src[((y + ky) * W + (x + kx)) * 4 + c] * k[(ky + 1) * 3 + (kx + 1)];
        id.data[(y * W + x) * 4 + c] = Math.max(0, Math.min(255, v));
      }
  l.ctx.putImageData(id, 0, 0);
  saveH();
  render();
  toast('Sharpen');
}

function doVignette() {
  const l = getPL();
  if (!l) return;
  const cx = CW / 2, cy = CH / 2, mr = Math.sqrt(cx * cx + cy * cy);
  const id = l.ctx.getImageData(0, 0, CW, CH);
  for (let y = 0; y < CH; y++)
    for (let x = 0; x < CW; x++) {
      const f = 1 - Math.pow(Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / mr, 1.6) * 0.85;
      const i = (y * CW + x) * 4;
      id.data[i] *= f;
      id.data[i + 1] *= f;
      id.data[i + 2] *= f;
    }
  l.ctx.putImageData(id, 0, 0);
  saveH();
  render();
  toast('Vignette');
}

function doFlipH() {
  const l = getPL();
  if (!l) return;
  const tmp = document.createElement('canvas');
  tmp.width = CW;
  tmp.height = CH;
  const tc = tmp.getContext('2d');
  tc.scale(-1, 1);
  tc.drawImage(l.canvas, -CW, 0);
  l.ctx.clearRect(0, 0, CW, CH);
  l.ctx.drawImage(tmp, 0, 0);
  saveH();
  render();
  toast('Flip H');
}

function doFlipV() {
  const l = getPL();
  if (!l) return;
  const tmp = document.createElement('canvas');
  tmp.width = CW;
  tmp.height = CH;
  const tc = tmp.getContext('2d');
  tc.scale(1, -1);
  tc.drawImage(l.canvas, 0, -CH);
  l.ctx.clearRect(0, 0, CW, CH);
  l.ctx.drawImage(tmp, 0, 0);
  saveH();
  render();
  toast('Flip V');
}


// ═══════════════════════════════════════════════════════════════
// FLOOD FILL
// ═══════════════════════════════════════════════════════════════
function floodFill(l, sx, sy) {
  const id = l.ctx.getImageData(0, 0, CW, CH), d = id.data;
  const i0 = (sy * CW + sx) * 4;
  const [tr, tg, tb, ta] = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]];
  const fr = parseInt(FC.slice(1, 3), 16), fg = parseInt(FC.slice(3, 5), 16), fb = parseInt(FC.slice(5, 7), 16);
  if (tr === fr && tg === fg && tb === fb) return;
  const vis = new Uint8Array(CW * CH);
  const stk = [sx, sy];
  while (stk.length) {
    const cy = stk.pop(), cx = stk.pop();
    if (cx < 0 || cy < 0 || cx >= CW || cy >= CH) continue;
    const idx = cy * CW + cx;
    if (vis[idx]) continue;
    const ii = idx * 4;
    if (Math.abs(d[ii] - tr) > 35 || Math.abs(d[ii + 1] - tg) > 35 || Math.abs(d[ii + 2] - tb) > 35 || Math.abs(d[ii + 3] - ta) > 35) continue;
    vis[idx] = 1;
    d[ii] = fr;
    d[ii + 1] = fg;
    d[ii + 2] = fb;
    d[ii + 3] = 255;
    stk.push(cx + 1, cy, cx - 1, cy, cx, cy + 1, cx, cy - 1);
  }
  l.ctx.putImageData(id, 0, 0);
}


// ═══════════════════════════════════════════════════════════════
// CONTEXT MENU
// ═══════════════════════════════════════════════════════════════
function showCtx(e) {
  const m = G('cmenu');
  m.style.display = 'block';
  m.style.left = e.clientX + 'px';
  m.style.top = e.clientY + 'px';
}


// ═══════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════
(function () {
  initC(800, 600);
  const bg = mkLayer('Background', 'pixel');
  bg.ctx.fillStyle = '#fff';
  bg.ctx.fillRect(0, 0, CW, CH);
  const l1 = mkLayer('Layer 1', 'pixel');
  layers = [l1, bg];
  AI = 0;
  setT('brush');
  saveH();
  render();
  setTimeout(fitScreen, 60);
  toast('Ready! Pick a color and start painting 🎨', 3000);

  // Color picker - real-time update
  G('cpick').addEventListener('input', e => {
    FC = e.target.value;
    G('fgsw').style.background = FC;
  });

  // Context menu
  document.addEventListener('click', () => G('cmenu').style.display = 'none');
})();
