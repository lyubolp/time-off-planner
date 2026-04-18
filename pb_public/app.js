function timeOffPlanner() {
  const pb = new PocketBase(window.location.origin);
  const createEmptyForm = () => ({ title: '', start_date: '', end_date: '', total_days: 1, planned_days: 1, taken_days: 0 });
  const toDateString = (value) => {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const normalizeStoredDate = (value) => {
    if (typeof value === 'string') {
      return value.slice(0, 10);
    }
    return toDateString(value);
  };
  const formatDisplayDate = (value) => {
    const normalized = normalizeStoredDate(value);
    if (!normalized) return '';
    const [year, month, day] = normalized.split('-');
    return `${day}/${month}/${year}`;
  };
  const DEFAULT_BATCH_SIZE = 200;

  return {
    theme: localStorage.getItem('theme') || 'light',
    activePage: 'dashboard',
    showAddModal: false,
    editingTimeOffId: null,
    monthOffset: 0,
    yearlyAllowance: 25,
    settingsId: null,
    holidays: [],
    timeOffs: [],
    months: [],
    dataTransferMessage: '',
    dataTransferError: '',
    totals: { total: 0, unused: 0, unplanned: 0 },
    form: createEmptyForm(),

    get upcomingTimeOffs() {
      const today = toDateString(new Date());
      return this.timeOffs.filter(t => t.end_date >= today);
    },
    get pastTimeOffs() {
      const today = toDateString(new Date());
      return this.timeOffs.filter(t => t.end_date < today);
    },
    get totalPlanned() {
      return this.timeOffs.reduce((sum, t) => sum + Number(t.planned_days || 0), 0);
    },
    get totalTaken() {
      return this.timeOffs.reduce((sum, t) => sum + Number(t.taken_days || 0), 0);
    },
    get unusedPercentage() {
      return this.totals.total > 0 ? Math.min((this.totals.unused / this.totals.total) * 100, 100) : 0;
    },
    get unplannedPercentage() {
      return this.totals.total > 0 ? Math.min((this.totals.unplanned / this.totals.total) * 100, 100) : 0;
    },
    get modalTitle() {
      return this.editingTimeOffId ? 'Edit Time Off' : 'Add Time Off';
    },
    get modalActionLabel() {
      return this.editingTimeOffId ? 'Save Changes' : 'Add Time Off';
    },

    async init() {
      document.documentElement.classList.toggle('dark', this.theme === 'dark');
      await this.loadData();
    },

    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', this.theme);
      document.documentElement.classList.toggle('dark', this.theme === 'dark');
    },

    async loadData() {
      const [holidays, timeOffs, settings] = await Promise.all([
        this.safeList('holidays', { sort: 'date' }),
        this.safeList('time_offs', { sort: '-start_date' }),
        this.safeList('app_settings', { perPage: 1 })
      ]);

      this.holidays = holidays.map((holiday) => ({
        ...holiday,
        date: normalizeStoredDate(holiday.date)
      }));
      this.timeOffs = timeOffs.map((item) => ({
        ...item,
        start_date: normalizeStoredDate(item.start_date),
        end_date: normalizeStoredDate(item.end_date)
      }));
      this.settingsId = null;
      this.yearlyAllowance = 25;
      if (settings[0]) {
        this.settingsId = settings[0].id;
        this.yearlyAllowance = Number(settings[0].yearly_allowance || 25);
      }

      this.computeTotals();
      this.buildMonths();
    },

    async safeList(collection, options = {}) {
      try {
        const perPage = options.perPage ?? DEFAULT_BATCH_SIZE;
        const query = { ...options };
        delete query.perPage;

        let page = 1;
        let items = [];

        while (true) {
          const result = await pb.collection(collection).getList(page, perPage, query);
          items = items.concat(result.items);
          if (page >= result.totalPages) break;
          page += 1;
        }

        return items;
      } catch (error) {
        console.warn(`Missing collection or inaccessible data: ${collection}`, error);
        return [];
      }
    },

    parseCsvLine(line) {
      const result = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const next = line[i + 1];

        if (char === '\"') {
          if (inQuotes && next === '\"') {
            current += '\"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }

      result.push(current.trim());
      return result;
    },

    async saveSettings() {
      const payload = { yearly_allowance: Number(this.yearlyAllowance || 0) };
      if (this.settingsId) {
        await pb.collection('app_settings').update(this.settingsId, payload);
      } else {
        const created = await pb.collection('app_settings').create(payload);
        this.settingsId = created.id;
      }
      this.computeTotals();
    },

    setDataTransferMessage(message) {
      this.dataTransferMessage = message;
      this.dataTransferError = '';
    },

    setDataTransferError(message) {
      this.dataTransferError = message;
      this.dataTransferMessage = '';
    },

    clearDataTransferFeedback() {
      this.dataTransferMessage = '';
      this.dataTransferError = '';
    },

    async importHolidays(event) {
      const file = event.target.files?.[0];
      if (!file) return;

      const content = await file.text();
      let rows = [];

      if (file.name.endsWith('.json')) {
        rows = JSON.parse(content);
      } else {
        rows = content.split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(1)
          .map((line) => {
            const [date, ...titleParts] = this.parseCsvLine(line);
            return { date: date?.trim(), title: titleParts.join(',').trim() };
          });
      }

      const existing = new Set(this.holidays.map((h) => `${h.date}|${h.title}`));
      for (const row of rows) {
        if (!row.date || !row.title) continue;
        const date = row.date.slice(0, 10);
        const key = `${date}|${row.title}`;
        if (!existing.has(key)) {
          await pb.collection('holidays').create({ date, title: row.title });
          existing.add(key);
        }
      }

      event.target.value = '';
      await this.loadData();
    },

    exportAllData() {
      this.clearDataTransferFeedback();

      const payload = {
        version: 1,
        exported_at: new Date().toISOString(),
        data: {
          app_settings: {
            yearly_allowance: Number(this.yearlyAllowance || 0)
          },
          holidays: this.holidays.map((holiday) => ({
            date: normalizeStoredDate(holiday.date),
            title: holiday.title
          })),
          time_offs: this.timeOffs.map((item) => ({
            title: item.title,
            start_date: normalizeStoredDate(item.start_date),
            end_date: normalizeStoredDate(item.end_date),
            total_days: Number(item.total_days ?? 0),
            planned_days: Number(item.planned_days ?? 0),
            taken_days: Number(item.taken_days ?? 0)
          }))
        }
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `time-off-planner-backup-${toDateString(new Date())}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.setDataTransferMessage('Backup exported.');
    },

    async deleteAllRecords(collection) {
      const items = await this.safeList(collection);
      for (const item of items) {
        await pb.collection(collection).delete(item.id);
      }
    },

    normalizeImportedBackup(payload) {
      const root = payload?.data ?? payload;
      if (!root || typeof root !== 'object') {
        throw new Error('Invalid backup format.');
      }

      const holidays = Array.isArray(root.holidays)
        ? root.holidays.map((holiday) => ({
            date: normalizeStoredDate(holiday.date),
            title: String(holiday.title || '').trim()
          })).filter((holiday) => holiday.date && holiday.title)
        : [];

      const timeOffs = Array.isArray(root.time_offs)
        ? root.time_offs.map((item) => ({
            title: String(item.title || '').trim(),
            start_date: normalizeStoredDate(item.start_date),
            end_date: normalizeStoredDate(item.end_date),
            total_days: Number(item.total_days ?? 0),
            planned_days: Number(item.planned_days ?? 0),
            taken_days: Number(item.taken_days ?? 0)
          })).filter((item) => item.title && item.start_date && item.end_date)
        : [];

      const yearlyAllowance = Number(root.app_settings?.yearly_allowance ?? 25);

      return {
        app_settings: { yearly_allowance: Number.isFinite(yearlyAllowance) ? yearlyAllowance : 25 },
        holidays,
        time_offs: timeOffs
      };
    },

    async importAllData(event) {
      const file = event.target.files?.[0];
      if (!file) return;

      this.clearDataTransferFeedback();

      try {
        const parsed = JSON.parse(await file.text());
        const backup = this.normalizeImportedBackup(parsed);

        await this.deleteAllRecords('time_offs');
        await this.deleteAllRecords('holidays');
        await this.deleteAllRecords('app_settings');

        await pb.collection('app_settings').create({
          yearly_allowance: backup.app_settings.yearly_allowance
        });

        for (const holiday of backup.holidays) {
          await pb.collection('holidays').create(holiday);
        }

        for (const item of backup.time_offs) {
          await pb.collection('time_offs').create(item);
        }

        event.target.value = '';
        await this.loadData();
        this.setDataTransferMessage('Backup imported.');
      } catch (error) {
        event.target.value = '';
        this.setDataTransferError(error instanceof Error ? error.message : 'Import failed.');
      }
    },

    formatDisplayDate(value) {
      return formatDisplayDate(value);
    },

    openAddModal() {
      this.editingTimeOffId = null;
      this.form = createEmptyForm();
      this.showAddModal = true;
    },

    openEditModal(item) {
      this.editingTimeOffId = item.id;
      this.form = {
        title: item.title,
        start_date: item.start_date,
        end_date: item.end_date,
        total_days: Number(item.total_days ?? 0),
        planned_days: Number(item.planned_days ?? 0),
        taken_days: Number(item.taken_days ?? 0)
      };
      this.showAddModal = true;
    },

    closeModal() {
      this.showAddModal = false;
      this.editingTimeOffId = null;
      this.form = createEmptyForm();
    },

    async submitTimeOff() {
      if (!this.form.title || !this.form.start_date || !this.form.end_date) return;

      const payload = {
        title: this.form.title.trim(),
        start_date: this.form.start_date,
        end_date: this.form.end_date,
        total_days: Number(this.form.total_days ?? 0),
        planned_days: Number(this.form.planned_days ?? 0),
        taken_days: Number(this.form.taken_days ?? 0)
      };

      if (this.editingTimeOffId) {
        await pb.collection('time_offs').update(this.editingTimeOffId, payload);
      } else {
        await pb.collection('time_offs').create(payload);
      }

      this.closeModal();
      await this.loadData();
    },

    shiftMonths(delta) {
      this.monthOffset += delta;
      this.buildMonths();
    },

    async deleteTimeOff(id) {
      await pb.collection('time_offs').delete(id);
      await this.loadData();
    },

    computeTotals() {
      const planned = this.timeOffs.reduce((sum, t) => sum + Number(t.planned_days || 0), 0);
      const taken = this.timeOffs.reduce((sum, t) => sum + Number(t.taken_days || 0), 0);
      const total = Number(this.yearlyAllowance || 0);

      this.totals = {
        total,
        unused: Math.max(total - taken, 0),
        unplanned: Math.max(total - planned, 0)
      };
    },

    buildMonths() {
      const now = new Date();
      const offsets = [-1 + this.monthOffset, 0 + this.monthOffset, 1 + this.monthOffset];
      const holidayMap = this.holidays.reduce((map, holiday) => {
        if (!map[holiday.date]) {
          map[holiday.date] = [];
        }
        map[holiday.date].push(holiday.title);
        return map;
      }, {});
      const today = toDateString(now);

      this.months = offsets.map((offset) => {
        const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
        const days = [];
        const publicHolidays = [];

        for (let i = 0; i < firstDay; i++) {
          days.push({ key: `empty-${i}`, empty: true, tags: [] });
        }

        for (let day = 1; day <= daysInMonth; day++) {
          const dateKey = toDateString(new Date(year, month, day));
          const tags = [];
          const holidayTitles = holidayMap[dateKey] || [];
          holidayTitles.forEach((title) => tags.push({ type: 'holiday', text: title }));
          if (holidayTitles.length > 0) {
            publicHolidays.push({
              key: `${dateKey}-holiday`,
              date: dateKey,
              day,
              label: holidayTitles.join(', ')
            });
          }

          const dayTimeOffs = this.timeOffs.filter((item) => dateKey >= item.start_date && dateKey <= item.end_date);
          dayTimeOffs.forEach((item) => tags.push({ type: 'timeoff', text: item.title }));

          days.push({
            key: dateKey,
            empty: false,
            date: dateKey,
            isToday: dateKey === today,
            hasHoliday: holidayTitles.length > 0,
            hasTimeOff: dayTimeOffs.length > 0,
            tags
          });
        }

        return {
          key: `${year}-${month}`,
          label: date.toLocaleString(undefined, { month: 'long' }),
          days,
          publicHolidays
        };
      });
    }
  };
}
