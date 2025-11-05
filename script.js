/* global luxon */
(() => {
const DateTime = luxon.DateTime;
const by = (sel) => document.querySelector(sel);
const fmt = (dt) => dt.toLocal().toFormat("ccc HH:mm");


const state = {
windows: [], // normalized {map, variant, tags, start/end in local timezone, confidence, note}
rotationMeta: null
};


// Load JSON helper
async function loadJSON(path) {
const res = await fetch(path, {cache: 'no-store'});
if (!res.ok) throw new Error(`Failed to load ${path}`);
return res.json();
}


function normalizeWindows(raw, todayStart) {
  const windows = [];
  
  // Add always-available maps (24/7) - they span the entire day
  if (raw.always_available) {
    raw.always_available.forEach(entry => {
      windows.push({
        map: entry.map,
        variant: entry.variant,
        tags: entry.tags || [],
        start: todayStart,
        end: todayStart.plus({days: 1}),
        confidence: entry.confidence || 'official',
        note: entry.note || ''
      });
    });
  }
  
  // Helper function to generate windows from a UTC day's schedule
  const addScheduleForUTCDay = (utcDayStart, schedule, checkWeekend = false, weekendSchedule = null) => {
    const dayOfWeekUTC = utcDayStart.weekday; // 1=Mon, 7=Sun
    const isWeekendUTC = dayOfWeekUTC >= 5 && dayOfWeekUTC <= 7;
    
    // Add weekday rotation
    if (schedule) {
      for (let hour = 0; hour < 24; hour++) {
        const entries = schedule.filter(e => e.hour === hour);
        entries.forEach(entry => {
          const startUTC = utcDayStart.set({hour: hour, minute: 0});
          const endUTC = utcDayStart.set({hour: hour + 1, minute: 0});
          windows.push({
            map: entry.map,
            variant: entry.variant,
            tags: entry.tags || [],
            start: startUTC.toLocal(),
            end: endUTC.toLocal(),
            confidence: entry.confidence || 'official',
            note: entry.note || ''
          });
        });
      }
    }
    
    // Add weekend additions if applicable
    if (checkWeekend && isWeekendUTC && weekendSchedule) {
      for (let hour = 0; hour < 24; hour++) {
        const entries = weekendSchedule.filter(e => e.hour === hour);
        entries.forEach(entry => {
          const startUTC = utcDayStart.set({hour: hour, minute: 0});
          const endUTC = utcDayStart.set({hour: hour + 1, minute: 0});
          windows.push({
            map: entry.map,
            variant: entry.variant,
            tags: entry.tags || [],
            start: startUTC.toLocal(),
            end: endUTC.toLocal(),
            confidence: entry.confidence || 'official',
            note: entry.note || ''
          });
        });
      }
    }
  };
  
  // Generate windows from yesterday, today, and tomorrow UTC
  // This ensures we cover all 24 hours of today's local day
  // (e.g., if local is EST (UTC-5), local 19:00-23:59 corresponds to tomorrow's UTC 00:00-04:59)
  const todayStartUTC = todayStart.toUTC().startOf('day');
  const yesterdayStartUTC = todayStartUTC.minus({days: 1});
  const tomorrowStartUTC = todayStartUTC.plus({days: 1});
  
  const weekdaySchedule = raw.weekday_rotation?.schedule;
  const weekendSchedule = raw.weekend_additions?.schedule;
  
  addScheduleForUTCDay(yesterdayStartUTC, weekdaySchedule, true, weekendSchedule);
  addScheduleForUTCDay(todayStartUTC, weekdaySchedule, true, weekendSchedule);
  addScheduleForUTCDay(tomorrowStartUTC, weekdaySchedule, true, weekendSchedule);
  
  return windows.sort((a,b) => a.start - b.start);
}


function applyOverrides(windows, overrides) {
if (!overrides || !overrides.overrides) return windows;
let list = [...windows];
for (const o of overrides.overrides) {
if (o.action === 'replace' && o.where && o.with) {
const start = DateTime.fromISO(o.where.start, {zone: 'utc'});
const end = DateTime.fromISO(o.where.end, {zone: 'utc'});
list = list.map(w => (w.start.equals(start) && w.end.equals(end))
? { ...w, ...o.with, confidence: o.with.confidence || 'community' }
: w);
} else if (o.action === 'add' && o.window) {
const add = normalizeWindows([o.window])[0];
if (add) list.push(add);
} else if (o.action === 'remove' && o.where) {
const start = DateTime.fromISO(o.where.start, {zone: 'utc'});
const end = DateTime.fromISO(o.where.end, {zone: 'utc'});
list = list.filter(w => !(w.start.equals(start) && w.end.equals(end)));
}
}
return list.sort((a,b) => a.start - b.start);
}


function isLive(w, now) {
return (w.start <= now) && (now < w.end);
}


function humanMap(w) { return `${w.map} — ${w.variant}`; }

function mergeConsecutiveWindows(windows) {
  if (windows.length === 0) return [];
  
  const merged = [];
  let current = {...windows[0]};
  
  for (let i = 1; i < windows.length; i++) {
    const next = windows[i];
    // Check if same map+variant and times are adjacent
    if (current.map === next.map && 
        current.variant === next.variant &&
        current.end.equals(next.start)) {
      // Extend current window
      current.end = next.end;
    } else {
      // Push completed window and start new one
      merged.push(current);
      current = {...next};
    }
  }
  merged.push(current); // Don't forget the last one
  
  return merged;
}

function makeItem(w) {
  const tagsHtml = w.tags && w.tags.length ? `<span class="tags">${w.tags.join(', ')}</span>` : '';
  const noteHtml = w.note ? `<small>${w.note}</small>` : '';
  return `
    <div class="item">
    <strong>${humanMap(w)}</strong>
    <span class="chip ${w.confidence}">${w.confidence}</span>
    ${tagsHtml}
    ${noteHtml}
  </div>
`;
}

function render() {
  const now = DateTime.local();

  // Restore todayItems calculation here for timeline
  const todayStart = now.startOf('day');
  const todayEnd = todayStart.plus({days: 1});
  // Update filter to include any window overlapping today
  const todayItems = state.windows.filter(w => w.end > todayStart && w.start < todayEnd);

  // Replace with vertical rendering
  const timelineEl = by('#timeline');
  const hoursEl = timelineEl.querySelector('.hours');
  const eventsEl = timelineEl.querySelector('.events');
  hoursEl.innerHTML = '';
  eventsEl.innerHTML = '';
  eventsEl.style.height = '1440px'; // 24 hours * 60px

  // Generate hour labels (0-23)
  const currentHour = now.hour;
  for (let h = 0; h < 24; h++) {
    const label = document.createElement('div');
    label.className = 'hour-label';
    if (h === currentHour) label.classList.add('current-hour');
    label.textContent = DateTime.local().startOf('day').plus({hours: h}).toFormat('HH:mm');
    hoursEl.appendChild(label);
  }

  // Render events
  if (todayItems.length) {
    const dayStart = todayStart;
    const pixelsPerHour = 60; // Height per hour
    
    // Sort events by start time, then by duration (longer first for better packing)
    todayItems.sort((a, b) => {
      const startDiff = a.start - b.start;
      if (startDiff !== 0) return startDiff;
      return (b.end - b.start) - (a.end - a.start);
    });
    
    // Auto-scroll to current hour after rendering
    setTimeout(() => {
      const currentOffset = ((now - dayStart) / (60 * 60 * 1000)) * pixelsPerHour;
      const timeline = by('#timeline');
      if (timeline) {
        timeline.scrollTop = Math.max(0, currentOffset - 200); // Scroll to current time with some padding above
      }
    }, 0);

    // Simple column assignment
    const columns = [];
    todayItems.forEach(event => {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const lastInCol = columns[i][columns[i].length - 1];
        if (event.start >= lastInCol.end) {
          columns[i].push(event);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([event]);
      }
    });

    // Render with left/width based on column, fixed 15% width per event
    // Split events into hourly segments so we can apply .past class individually
    todayItems.forEach(w => {
      // Find which column this event is in
      const colIndex = columns.findIndex(col => col.includes(w));
      const barWidth = 15; // Fixed 15% width
      const left = colIndex * barWidth;

      const start = w.start.toLocal();
      const end = w.end.toLocal();
      const currentTime = now;
      
      // Calculate how many hours this event spans
      const eventDurationHours = Math.ceil((end - start) / (60 * 60 * 1000));
      
      // Create a segment for each hour
      for (let hourOffset = 0; hourOffset < eventDurationHours; hourOffset++) {
        const segmentStart = start.plus({hours: hourOffset});
        const segmentEnd = start.plus({hours: hourOffset + 1});
        
        // Clip segment to event boundaries
        const clippedStart = segmentStart < start ? start : segmentStart;
        const clippedEnd = segmentEnd > end ? end : segmentEnd;
        
        const segmentTop = ((clippedStart - dayStart) / (60 * 60 * 1000)) * pixelsPerHour;
        const segmentHeight = ((clippedEnd - clippedStart) / (60 * 60 * 1000)) * pixelsPerHour;
        
        const segment = document.createElement('div');
        segment.className = `event-bar ${w.confidence}`;
        segment.setAttribute('data-map', w.map);
        segment.style.position = 'absolute';
        segment.style.top = `${segmentTop}px`;
        segment.style.height = `${segmentHeight}px`;
        segment.style.left = `${left}%`;
        segment.style.width = `${barWidth}%`;
        
        // Check if this hour segment is the current one
        const isCurrentHour = currentTime >= segmentStart && currentTime < segmentEnd;
        if (!isCurrentHour) {
          segment.classList.add('past');
        }
        
        // Add label to: first segment, every 4 hours for long events, OR the current active hour
        if (hourOffset === 0 || (eventDurationHours >= 24 && hourOffset % 4 === 0) || isCurrentHour) {
          const label = document.createElement('strong');
          label.textContent = humanMap(w);
          label.style.position = 'relative';
          label.style.zIndex = '1';
          segment.appendChild(label);
        }
        
        segment.title = `${w.confidence}${w.tags?.length ? ' (' + w.tags.join(', ') + ')' : ''}${w.note ? '\n' + w.note : ''}`;
        eventsEl.appendChild(segment);
      }
    });
    
    // Add current time indicator line
    const currentOffset = ((now - dayStart) / (60 * 60 * 1000)) * pixelsPerHour;
    const timeLine = document.createElement('div');
    timeLine.style.position = 'absolute';
    timeLine.style.top = `${currentOffset}px`;
    timeLine.style.left = '0';
    timeLine.style.right = '0';
    timeLine.style.height = '2px';
    timeLine.style.background = 'rgba(239, 68, 68, 0.7)'; // Red with opacity
    timeLine.style.zIndex = '100';
    timeLine.style.pointerEvents = 'none';
    timeLine.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.5)';
    eventsEl.appendChild(timeLine);

  } else {
    eventsEl.innerHTML = '<p class="muted" style="padding: 16px;">No maps today</p>';
  }

  // Add current time update
  by('#current-time').textContent = fmt(now);
  
  // Update server region clocks
  updateServerClocks();
}

function updateServerClocks() {
  const timezones = {
    'clock-na': 'America/New_York',
    'clock-sa': 'America/Sao_Paulo',
    'clock-eu': 'Europe/London',
    'clock-af': 'Africa/Cairo',
    'clock-ea': 'Asia/Shanghai',
    'clock-sea': 'Australia/Sydney'
  };
  
  for (const [id, tz] of Object.entries(timezones)) {
    const time = DateTime.now().setZone(tz).toFormat('HH:mm');
    const el = by(`#${id}`);
    if (el) el.textContent = time;
  }
}

async function init() {
  try {
    const rotation = await loadJSON('rotation.json');
    let overrides = null;
    try {
      overrides = await loadJSON('overrides.json');
    } catch (e) {
      console.warn('No overrides file or failed to load:', e);
    }

    // Use local time for display, but convert UTC schedule times in normalizeWindows
    const now = DateTime.local();
    const todayStart = now.startOf('day');
    state.rotationMeta = rotation.metadata;
    let windows = normalizeWindows(rotation, todayStart);
    if (overrides && overrides.overrides) {
      windows = applyOverrides(windows, overrides);
    }
    // Merge consecutive windows with same map+variant
    windows = mergeConsecutiveWindows(windows);
    state.windows = windows;

    render();

    // Refresh every minute
    setInterval(render, 60000);

  } catch (e) {
    console.error(e);
    console.log('Error loading schedule:', e.message);
  }
}

init();

})();
