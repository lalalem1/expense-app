import React, { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";

const STORAGE_KEY = "personal-expense-mvp-v6";
const LEGACY_STORAGE_KEYS = ["personal-expense-mvp-v5", "personal-expense-mvp-v4", "personal-expense-mvp-v3", "personal-expense-mvp-v2", "personal-expense-mvp-v1"];

const EXPENSE_CATEGORIES = ["餐饮", "交通", "购物", "娱乐", "护肤美妆", "人情社交", "房租水电", "医疗健康", "学习工作", "其他"];

const EXPENSE_SUBCATEGORIES = {
  餐饮: ["早餐", "午餐", "晚餐", "零食", "饮料", "其他"],
  交通: ["地铁公交", "打车", "高铁机票", "停车加油", "其他"],
  购物: ["衣服", "日用品", "数码", "家居", "其他"],
  娱乐: ["追星", "电影演出", "游戏", "旅行", "其他"],
  护肤美妆: ["护肤", "彩妆", "医美", "美甲美发", "其他"],
  人情社交: ["礼物", "红包", "朋友聚会", "其他"],
  房租水电: ["房租", "水电燃气", "物业", "网络", "其他"],
  医疗健康: ["药品", "体检", "运动", "保险", "其他"],
  学习工作: ["课程", "书籍", "办公", "软件订阅", "其他"],
  其他: ["杂项", "其他"],
};

const BUDGET_CATEGORIES = ["餐饮", "购物", "娱乐"];
const DINING_SUBCATEGORIES = ["早餐", "午餐", "晚餐", "零食", "饮料", "其他"];

const DEFAULT_CATEGORY_BUDGETS = { 餐饮: 0, 购物: 0, 娱乐: 0 };
const DEFAULT_DINING_SUBCATEGORY_BUDGETS = { 早餐: 0, 午餐: 0, 晚餐: 0, 零食: 0, 饮料: 0, 其他: 0 };

const COLORS = ["#6D8BFF", "#7CC9A4", "#F4B860", "#D88C9A", "#9D7CD8", "#6FB7D6", "#E8A87C", "#8FB996", "#C7A6E8", "#A8B2C1"];
const CHART_GRID_COLOR = "#EEF1F6";
const CHART_AXIS_COLOR = "#8A94A6";
const BUTTON_CLASS = "inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-600";
const ICON_BUTTON_CLASS = "inline-flex items-center justify-center rounded-xl bg-indigo-500 p-2 text-white shadow-sm transition hover:bg-indigo-600";
const TABLE_BUTTON_CLASS = "inline-flex items-center justify-center rounded-xl bg-indigo-500 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-600";
const DEFAULT_BUDGET = 4000;

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = getLocalDateString();
const currentMonth = today.slice(0, 7);

const initialForm = {
  id: null,
  date: today,
  category: "餐饮",
  subcategory: "早餐",
  amount: "",
  note: "",
};

function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (name === "plus") {
    return (
      <svg {...common}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    );
  }

  if (name === "trash") {
    return (
      <svg {...common}>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v5" />
        <path d="M14 11v5" />
      </svg>
    );
  }

  if (name === "pencil") {
    return (
      <svg {...common}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    );
  }

  if (name === "download") {
    return (
      <svg {...common}>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...common}>
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M3 10h18" />
      </svg>
    );
  }

  return null;
}

function safeStorage() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage;
}

function createId() {
  if (typeof globalThis !== "undefined" && globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeBudgetMap(value, defaults) {
  return Object.keys(defaults).reduce((result, key) => {
    result[key] = Math.max(toNumber(value?.[key]), 0);
    return result;
  }, {});
}

function normalizeBudgetsByMonth(value, defaults) {
  if (!value || typeof value !== "object") return {};
  return Object.entries(value).reduce((result, [month, budget]) => {
    if (/^\d{4}-\d{2}$/.test(month)) {
      result[month] = normalizeBudgetMap(budget, defaults);
    }
    return result;
  }, {});
}

function getBudgetForMonth(budgetsByMonth, month, defaults) {
  return normalizeBudgetMap(budgetsByMonth?.[month], defaults);
}

function normalizeEntry(entry) {
  if (entry?.type === "income") return null;

  const category = EXPENSE_CATEGORIES.includes(entry?.category) ? entry.category : "其他";
  const availableSubcategories = EXPENSE_SUBCATEGORIES[category] || EXPENSE_SUBCATEGORIES.其他;
  const fallbackSubcategory = availableSubcategories.includes("其他") ? "其他" : availableSubcategories[0];
  const subcategory = availableSubcategories.includes(entry?.subcategory) ? entry.subcategory : fallbackSubcategory;
  const amount = Math.max(toNumber(entry?.amount), 0);
  const date = typeof entry?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) ? entry.date : today;
  const now = new Date().toISOString();

  return {
    id: entry?.id || createId(),
    date,
    category,
    subcategory,
    amount,
    note: typeof entry?.note === "string" ? entry.note : "",
    createdAt: entry?.createdAt || now,
    updatedAt: entry?.updatedAt || now,
  };
}

function readStoredPayload(storage) {
  const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
  for (const key of keys) {
    const raw = storage.getItem(key);
    if (raw) return raw;
  }
  return null;
}

function getEmptyState() {
  return {
    entries: [],
    monthlyBudget: DEFAULT_BUDGET,
    categoryBudgetsByMonth: {},
    diningSubcategoryBudgetsByMonth: {},
  };
}

function loadState() {
  try {
    const storage = safeStorage();
    if (!storage) return getEmptyState();
    const raw = readStoredPayload(storage);
    if (!raw) return getEmptyState();
    const parsed = JSON.parse(raw);
    const monthlyBudget = toNumber(parsed?.monthlyBudget);
    const entries = Array.isArray(parsed?.entries) ? parsed.entries.map(normalizeEntry).filter(Boolean) : [];

    return {
      entries,
      monthlyBudget: monthlyBudget >= 0 ? monthlyBudget : DEFAULT_BUDGET,
      categoryBudgetsByMonth: normalizeBudgetsByMonth(parsed?.categoryBudgetsByMonth, DEFAULT_CATEGORY_BUDGETS),
      diningSubcategoryBudgetsByMonth: normalizeBudgetsByMonth(parsed?.diningSubcategoryBudgetsByMonth, DEFAULT_DINING_SUBCATEGORY_BUDGETS),
    };
  } catch {
    return getEmptyState();
  }
}

function saveState(payload) {
  try {
    const storage = safeStorage();
    if (!storage) return;
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

function yuan(value) {
  return Number(value || 0).toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function calculateMonthStats(entries, monthlyBudget) {
  const total = entries.reduce((sum, item) => sum + item.amount, 0);
  const remain = monthlyBudget - total;
  const count = entries.length;
  const average = count > 0 ? total / count : 0;
  return { total, remain, count, average };
}

function buildDailyData(entries) {
  const map = new Map();
  entries.forEach((item) => {
    if (!map.has(item.date)) {
      map.set(item.date, { date: item.date.slice(5), 支出: 0 });
    }
    map.get(item.date).支出 += item.amount;
  });
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function buildCategoryData(entries) {
  const map = new Map();
  entries.forEach((item) => {
    map.set(item.category, (map.get(item.category) || 0) + item.amount);
  });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function buildSubTrendData(entries, trendCategory) {
  const map = new Map();
  const subcategories = EXPENSE_SUBCATEGORIES[trendCategory] || [];
  entries
    .filter((item) => item.category === trendCategory)
    .forEach((item) => {
      if (!map.has(item.date)) {
        const seed = { date: item.date.slice(5) };
        subcategories.forEach((sub) => {
          seed[sub] = 0;
        });
        map.set(item.date, seed);
      }
      const current = map.get(item.date);
      current[item.subcategory] = (current[item.subcategory] || 0) + item.amount;
    });
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function buildBudgetRows(entries, budgetNames, budgets) {
  return budgetNames.map((name) => {
    const spent = entries.reduce((sum, item) => {
      if (item.category === name || item.subcategory === name) return sum + item.amount;
      return sum;
    }, 0);
    const budget = Math.max(toNumber(budgets?.[name]), 0);
    const remain = budget - spent;
    const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    return { name, spent, budget, remain, percent };
  });
}

function createEntryFromForm(form, existingEntry) {
  const amount = Math.max(toNumber(form.amount), 0);

  if (!form.date || !form.category || amount <= 0) {
    return { error: "请至少填写日期、分类和金额。" };
  }

  const now = new Date().toISOString();

  return {
    item: {
      id: form.id || createId(),
      date: form.date,
      category: form.category,
      subcategory: form.subcategory,
      amount,
      note: form.note.trim(),
      createdAt: existingEntry?.createdAt || now,
      updatedAt: now,
    },
  };
}

function runSelfTests() {
  const sampleEntries = [
    normalizeEntry({ date: "2026-05-01", category: "餐饮", subcategory: "早餐", amount: 20 }),
    normalizeEntry({ date: "2026-05-01", category: "购物", subcategory: "衣服", amount: 100 }),
    normalizeEntry({ date: "2026-05-02", category: "餐饮", subcategory: "晚餐", amount: 60 }),
    normalizeEntry({ type: "income", date: "2026-05-02", category: "工资", subcategory: "工资", amount: 1000 }),
  ].filter(Boolean);
  const stats = calculateMonthStats(sampleEntries, 300);
  const daily = buildDailyData(sampleEntries);
  const category = buildCategoryData(sampleEntries);
  const trend = buildSubTrendData(sampleEntries, "餐饮");
  const categoryBudgetRows = buildBudgetRows(sampleEntries, BUDGET_CATEGORIES, { 餐饮: 100, 购物: 80, 娱乐: 200 });
  const diningBudgetRows = buildBudgetRows(sampleEntries.filter((item) => item.category === "餐饮"), DINING_SUBCATEGORIES, { 早餐: 30, 晚餐: 50 });
  const created = createEntryFromForm({ ...initialForm, amount: "120" }, null);
  const invalid = createEntryFromForm({ ...initialForm, amount: "0" }, null);

  console.assert(sampleEntries.length === 3, "income entries should be ignored");
  console.assert(stats.total === 180, "stats.total failed");
  console.assert(stats.remain === 120, "stats.remain failed");
  console.assert(stats.count === 3, "stats.count failed");
  console.assert(stats.average === 60, "stats.average failed");
  console.assert(daily.length === 2 && daily[0].支出 === 120, "dailyData failed");
  console.assert(category[0].name === "餐饮" && category[0].value === 80, "categoryData failed");
  console.assert(trend.length === 2 && trend[0].早餐 === 20 && trend[1].晚餐 === 60, "subTrendData failed");
  console.assert(categoryBudgetRows[0].spent === 80 && categoryBudgetRows[0].remain === 20, "category budget rows failed");
  console.assert(diningBudgetRows[0].spent === 20 && diningBudgetRows[2].remain === -10, "dining budget rows failed");
  console.assert(created.item.amount === 120, "create entry failed");
  console.assert(Boolean(invalid.error), "validation failed");
  console.assert(EXPENSE_CATEGORIES.every((categoryName) => (EXPENSE_SUBCATEGORIES[categoryName] || []).includes("其他")), "expense subcategories other option failed");
  console.assert(DINING_SUBCATEGORIES.every((name) => EXPENSE_SUBCATEGORIES.餐饮.includes(name)), "dining subcategories failed");
}

if (typeof window !== "undefined" && !window.__PERSONAL_EXPENSE_MVP_TESTED_V6__) {
  window.__PERSONAL_EXPENSE_MVP_TESTED_V6__ = true;
  runSelfTests();
}

function Panel({ children, className = "" }) {
  return <div className={`rounded-3xl bg-white shadow-sm ring-1 ring-gray-100 ${className}`}>{children}</div>;
}

function SectionTitle({ title, description, right }) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <h2 className="text-lg font-semibold text-gray-950">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {right}
    </div>
  );
}

function MetricCard({ label, value, hint, tone = "neutral" }) {
  const styles = {
    expense: "from-indigo-50 to-white text-indigo-600 ring-indigo-100",
    danger: "from-rose-50 to-white text-rose-500 ring-rose-100",
    neutral: "from-gray-50 to-white text-gray-950 ring-gray-100",
  };

  return (
    <div className={`rounded-3xl bg-gradient-to-br p-5 shadow-sm ring-1 ${styles[tone] || styles.neutral}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">¥{yuan(value)}</p>
      {hint && <p className="mt-2 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function CountCard({ label, value, hint }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-950">{value}</p>
      {hint && <p className="mt-2 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function EmptyState({ text = "暂无数据" }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
      {text}
    </div>
  );
}

function BudgetInputGrid({ title, description, names, values, onChange, compact = false }) {
  return (
    <Panel className="p-5">
      <SectionTitle title={title} description={description} />
      <div className={`mt-4 grid gap-3 ${compact ? "grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {names.map((name) => (
          <label key={name} className="rounded-2xl bg-gray-50 p-3 text-sm ring-1 ring-gray-100">
            <span className="text-gray-600">{name}</span>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-gray-400">¥</span>
              <input
                type="number"
                min="0"
                className="w-full bg-transparent text-base font-semibold text-gray-950 outline-none"
                value={values[name] ?? 0}
                onChange={(event) => onChange(name, event.target.value)}
              />
            </div>
          </label>
        ))}
      </div>
    </Panel>
  );
}

function BudgetProgressList({ title, description, rows, compact = false }) {
  if (compact) {
    return (
      <Panel className="p-5">
        <SectionTitle title={title} description={description} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {rows.map((row, index) => (
            <div key={row.name} className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-950">{row.name}</p>
                <p className={`text-xs font-semibold ${row.remain >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                  {row.remain >= 0 ? "余" : "超"} ¥{yuan(Math.abs(row.remain))}
                </p>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <p className="text-lg font-semibold tracking-tight text-gray-950">¥{yuan(row.spent)}</p>
                <p className="text-[11px] text-gray-400">/ ¥{yuan(row.budget)}</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${row.percent}%`, background: `linear-gradient(90deg, ${COLORS[index % COLORS.length]}, ${COLORS[(index + 1) % COLORS.length]})` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    );
  }

  return (
    <Panel className="p-5">
      <SectionTitle title={title} description={description} />
      <div className="mt-5 space-y-4">
        {rows.map((row, index) => (
          <div key={row.name} className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-gray-950">{row.name}</p>
                <p className="mt-1 text-xs text-gray-500">已花 ¥{yuan(row.spent)} / 预算 ¥{yuan(row.budget)}</p>
              </div>
              <div className={`text-sm font-semibold ${row.remain >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                {row.remain >= 0 ? "剩余" : "超出"} ¥{yuan(Math.abs(row.remain))}
              </div>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${row.percent}%`, background: `linear-gradient(90deg, ${COLORS[index % COLORS.length]}, ${COLORS[(index + 1) % COLORS.length]})` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function StructureCard({ title, description, data, emptyText, colorOffset = 0 }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const topItems = data.slice(0, 6);

  return (
    <Panel className="p-5">
      <SectionTitle title={title} description={description} />
      {data.length ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={4} stroke="#ffffff" strokeWidth={3}>
                  {data.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[(index + colorOffset) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `¥${yuan(value)}`} contentStyle={{ borderRadius: 16, border: "1px solid #E5E7EB", boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 self-center">
            {topItems.map((item, index) => {
              const percent = total > 0 ? (item.value / total) * 100 : 0;
              return (
                <div key={item.name} className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[(index + colorOffset) % COLORS.length] }} />
                      <span className="text-sm font-medium text-gray-950">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-950">¥{yuan(item.value)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: COLORS[(index + colorOffset) % COLORS.length] }} />
                    </div>
                    <span className="w-10 text-right text-xs text-gray-500">{Math.round(percent)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState text={emptyText} />
      )}
    </Panel>
  );
}

export default function PersonalExpenseMVP() {
  const [savedState] = useState(loadState);
  const [entries, setEntries] = useState(savedState.entries);
  const [monthlyBudget, setMonthlyBudget] = useState(savedState.monthlyBudget);
  const [categoryBudgetsByMonth, setCategoryBudgetsByMonth] = useState(savedState.categoryBudgetsByMonth);
  const [diningSubcategoryBudgetsByMonth, setDiningSubcategoryBudgetsByMonth] = useState(savedState.diningSubcategoryBudgetsByMonth);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [trendCategory, setTrendCategory] = useState("餐饮");
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editingDraft, setEditingDraft] = useState(null);

  function persist(nextEntries, nextBudget, nextCategoryBudgetsByMonth, nextDiningSubcategoryBudgetsByMonth) {
    saveState({
      entries: nextEntries,
      monthlyBudget: nextBudget,
      categoryBudgetsByMonth: nextCategoryBudgetsByMonth,
      diningSubcategoryBudgetsByMonth: nextDiningSubcategoryBudgetsByMonth,
    });
  }

  function updateEntries(nextEntries) {
    setEntries(nextEntries);
    persist(nextEntries, monthlyBudget, categoryBudgetsByMonth, diningSubcategoryBudgetsByMonth);
  }

  function updateBudget(value) {
    const next = Math.max(toNumber(value), 0);
    setMonthlyBudget(next);
    persist(entries, next, categoryBudgetsByMonth, diningSubcategoryBudgetsByMonth);
  }

  function updateCategoryBudget(name, value) {
    const nextMonthBudget = {
      ...getBudgetForMonth(categoryBudgetsByMonth, selectedMonth, DEFAULT_CATEGORY_BUDGETS),
      [name]: Math.max(toNumber(value), 0),
    };
    const next = { ...categoryBudgetsByMonth, [selectedMonth]: nextMonthBudget };
    setCategoryBudgetsByMonth(next);
    persist(entries, monthlyBudget, next, diningSubcategoryBudgetsByMonth);
  }

  function updateDiningSubcategoryBudget(name, value) {
    const nextMonthBudget = {
      ...getBudgetForMonth(diningSubcategoryBudgetsByMonth, selectedMonth, DEFAULT_DINING_SUBCATEGORY_BUDGETS),
      [name]: Math.max(toNumber(value), 0),
    };
    const next = { ...diningSubcategoryBudgetsByMonth, [selectedMonth]: nextMonthBudget };
    setDiningSubcategoryBudgetsByMonth(next);
    persist(entries, monthlyBudget, categoryBudgetsByMonth, next);
  }

  const filtered = useMemo(() => entries.filter((entry) => entry.date.startsWith(selectedMonth)), [entries, selectedMonth]);
  const monthStats = useMemo(() => calculateMonthStats(filtered, monthlyBudget), [filtered, monthlyBudget]);
  const dailyData = useMemo(() => buildDailyData(filtered), [filtered]);
  const categoryData = useMemo(() => buildCategoryData(filtered), [filtered]);
  const subTrendData = useMemo(() => buildSubTrendData(filtered, trendCategory), [filtered, trendCategory]);
  const selectedCategoryBudgets = useMemo(() => getBudgetForMonth(categoryBudgetsByMonth, selectedMonth, DEFAULT_CATEGORY_BUDGETS), [categoryBudgetsByMonth, selectedMonth]);
  const selectedDiningSubcategoryBudgets = useMemo(() => getBudgetForMonth(diningSubcategoryBudgetsByMonth, selectedMonth, DEFAULT_DINING_SUBCATEGORY_BUDGETS), [diningSubcategoryBudgetsByMonth, selectedMonth]);
  const categoryBudgetRows = useMemo(() => buildBudgetRows(filtered, BUDGET_CATEGORIES, selectedCategoryBudgets), [filtered, selectedCategoryBudgets]);
  const diningBudgetRows = useMemo(
    () => buildBudgetRows(filtered.filter((entry) => entry.category === "餐饮"), DINING_SUBCATEGORIES, selectedDiningSubcategoryBudgets),
    [filtered, selectedDiningSubcategoryBudgets]
  );

  const todayStats = useMemo(() => {
    const todayEntries = entries.filter((entry) => entry.date === today);
    return {
      total: todayEntries.reduce((sum, item) => sum + item.amount, 0),
      count: todayEntries.length,
    };
  }, [entries]);

  function handleCategoryChange(category) {
    setForm((prev) => ({
      ...prev,
      category,
      subcategory: (EXPENSE_SUBCATEGORIES[category] || EXPENSE_SUBCATEGORIES.其他)[0],
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const existingEntry = form.id ? entries.find((item) => item.id === form.id) : null;
    const result = createEntryFromForm(form, existingEntry);

    if (result.error) {
      setMessage(result.error);
      return;
    }

    const nextItem = result.item;
    const nextEntries = form.id ? entries.map((item) => (item.id === form.id ? nextItem : item)) : [nextItem, ...entries];

    updateEntries(nextEntries);
    setForm(initialForm);
    setSelectedMonth(nextItem.date.slice(0, 7));
    setMessage("支出已新增。");
  }

  function startInlineEdit(entry) {
    setEditingEntryId(entry.id);
    setEditingDraft({
      id: entry.id,
      date: entry.date,
      category: entry.category,
      subcategory: entry.subcategory,
      amount: String(entry.amount),
      note: entry.note || "",
    });
  }

  function cancelInlineEdit() {
    setEditingEntryId(null);
    setEditingDraft(null);
  }

  function updateInlineDraft(field, value) {
    setEditingDraft((prev) => {
      if (!prev) return prev;
      if (field === "category") {
        return {
          ...prev,
          category: value,
          subcategory: (EXPENSE_SUBCATEGORIES[value] || EXPENSE_SUBCATEGORIES.其他)[0],
        };
      }
      return { ...prev, [field]: value };
    });
  }

  function saveInlineEdit() {
    if (!editingDraft) return;
    const existingEntry = entries.find((item) => item.id === editingDraft.id);
    const result = createEntryFromForm(editingDraft, existingEntry);

    if (result.error) {
      setMessage(result.error);
      return;
    }

    const nextEntries = entries.map((item) => (item.id === editingDraft.id ? result.item : item));
    updateEntries(nextEntries);
    setSelectedMonth(result.item.date.slice(0, 7));
    setMessage("支出已更新。");
    cancelInlineEdit();
  }

  function deleteEntry(id) {
    const nextEntries = entries.filter((item) => item.id !== id);
    updateEntries(nextEntries);
    if (editingEntryId === id) cancelInlineEdit();
    setMessage("支出已删除。");
  }

  function exportCSV() {
    const header = ["日期", "分类", "小分类", "金额", "备注"];
    const rows = filtered
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => [item.date, item.category, item.subcategory, item.amount, item.note || ""]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedMonth}-支出导出.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const progressWidth = monthlyBudget > 0 ? Math.min((monthStats.total / monthlyBudget) * 100, 100) : 0;
  const trendSubcategories = EXPENSE_SUBCATEGORIES[trendCategory] || [];
  const formSubcategories = EXPENSE_SUBCATEGORIES[form.category] || ["其他"];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950">
      <header className="border-b border-gray-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-medium text-gray-500">Personal Expense MVP</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">我的支出仪表盘</h1>
              <p className="mt-2 text-sm text-gray-500">先看本月支出，再看预算消耗和消费结构，最后看支出明细。</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-3 text-sm ring-1 ring-gray-100">
                <Icon name="calendar" size={16} />
                <input type="month" className="bg-transparent outline-none" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value || currentMonth)} />
              </label>
              <button type="button" onClick={exportCSV} className={BUTTON_CLASS}>
                <Icon name="download" size={16} />
                导出 CSV
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[360px_1fr] lg:px-8">
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Panel className="p-5">
            <SectionTitle title="新增支出" description="填写日期、分类、小分类、金额和备注；修改支出请在下方明细表内直接编辑。" />

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">日期</label>
                <input type="date" className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-950" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">分类</label>
                  <select className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-950" value={form.category} onChange={(event) => handleCategoryChange(event.target.value)}>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">小分类</label>
                  <select className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-950" value={form.subcategory} onChange={(event) => setForm({ ...form, subcategory: event.target.value })}>
                    {formSubcategories.map((subcategory) => (
                      <option key={subcategory} value={subcategory}>{subcategory}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">金额</label>
                <input type="number" min="0" step="0.01" placeholder="例如 128" className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-950" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">备注</label>
                <input placeholder="例如 早餐 / 买衣服 / 打车" className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-950" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
              </div>

              {message && <p className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">{message}</p>}

              <div className="flex gap-3">
                <button type="submit" className={`${BUTTON_CLASS} flex-1`}>新增支出</button>
              </div>
            </form>
          </Panel>

          <Panel className="p-5">
            <SectionTitle title="今日快速看" description="今天新增的支出。" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-indigo-50 p-3 ring-1 ring-indigo-100">
                <p className="text-xs text-indigo-700/70">今日支出</p>
                <p className="mt-2 font-semibold text-indigo-600">¥{yuan(todayStats.total)}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100">
                <p className="text-xs text-gray-500">今日笔数</p>
                <p className="mt-2 font-semibold text-gray-950">{todayStats.count}</p>
              </div>
            </div>
          </Panel>

          <BudgetInputGrid title="重点分类预算" description="餐饮、购物、娱乐。" names={BUDGET_CATEGORIES} values={selectedCategoryBudgets} onChange={updateCategoryBudget} compact />
          <BudgetInputGrid title="餐饮小分类预算" description="早餐、午餐、晚餐等。" names={DINING_SUBCATEGORIES} values={selectedDiningSubcategoryBudgets} onChange={updateDiningSubcategoryBudget} compact />
        </aside>

        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="本月总支出" value={monthStats.total} hint="所有支出金额合计" tone="expense" />
            <MetricCard label="月度预算" value={monthlyBudget} hint="可在走势图右上角修改" />
            <MetricCard label="预算剩余" value={monthStats.remain} hint={monthStats.remain >= 0 ? "支出仍在预算内" : "支出已超预算"} tone={monthStats.remain >= 0 ? "neutral" : "danger"} />
            <CountCard label="本月支出笔数" value={monthStats.count} hint={`单笔均值 ¥${yuan(monthStats.average)}`} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Panel className="p-5">
              <SectionTitle
                title="每日支出走势"
                description="查看每天支出变化，顺便观察月预算消耗进度。"
                right={
                  <label className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm">
                    月预算
                    <input type="number" min="0" className="w-24 bg-transparent text-right font-semibold outline-none" value={monthlyBudget} onChange={(event) => updateBudget(event.target.value)} />
                  </label>
                }
              />
              <div className="mt-5 h-4 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 transition-all" style={{ width: `${progressWidth}%` }} />
              </div>
              <div className="mt-3 flex justify-between text-xs text-gray-500">
                <span>已支出 ¥{yuan(monthStats.total)}</span>
                <span>预算 ¥{yuan(monthlyBudget)}</span>
              </div>

              {dailyData.length ? (
                <div className="mt-5 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <defs>
                        <linearGradient id="dailyExpenseGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6D8BFF" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#9D7CD8" stopOpacity={0.85} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value) => `¥${yuan(value)}`} contentStyle={{ borderRadius: 16, border: "1px solid #E5E7EB", boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)" }} />
                      <Legend iconType="circle" />
                      <Bar dataKey="支出" radius={[10, 10, 0, 0]} fill="url(#dailyExpenseGradient)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState text="本月还没有支出数据" />
              )}
            </Panel>

            <div className="space-y-6">
              <BudgetProgressList title="重点分类预算消耗" description="餐饮、购物、娱乐本月花费进度。" rows={categoryBudgetRows} />
              <BudgetProgressList title="餐饮小分类预算消耗" description="早餐、午餐、晚餐、零食、饮料、其他。" rows={diningBudgetRows} compact />
            </div>
          </div>

          <StructureCard title="支出结构" description="看钱主要花在哪里。" data={categoryData} emptyText="本月还没有支出数据" />

          <Panel className="p-5">
            <SectionTitle
              title="支出小分类趋势"
              description="选择一个支出大分类，看里面各个小分类的日趋势。"
              right={
                <select className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-950" value={trendCategory} onChange={(event) => setTrendCategory(event.target.value)}>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              }
            />
            {subTrendData.length ? (
              <div className="mt-4 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={subTrendData}>
                    <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => `¥${yuan(value)}`} contentStyle={{ borderRadius: 16, border: "1px solid #E5E7EB", boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)" }} />
                    <Legend iconType="circle" />
                    {trendSubcategories.map((sub, index) => (
                      <Line key={sub} type="monotone" dataKey={sub} stroke={COLORS[index % COLORS.length]} strokeWidth={2.6} dot={{ r: 3, strokeWidth: 2, fill: "#ffffff" }} activeDot={{ r: 5 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState text="该分类本月还没有支出小分类趋势数据" />
            )}
          </Panel>

          <Panel className="p-5">
            <SectionTitle title="本月支出明细" description="点击某一行的编辑后，可直接在本表内修改并保存。" />
            <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100">
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">日期</th>
                      <th className="px-4 py-3 font-medium">分类</th>
                      <th className="px-4 py-3 font-medium">小分类</th>
                      <th className="px-4 py-3 text-right font-medium">金额</th>
                      <th className="px-4 py-3 font-medium">备注</th>
                      <th className="px-4 py-3 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filtered.length ? (
                      filtered
                        .slice()
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((entry) => {
                          const isEditing = editingEntryId === entry.id && editingDraft;
                          const rowSubcategories = isEditing ? EXPENSE_SUBCATEGORIES[editingDraft.category] || EXPENSE_SUBCATEGORIES.其他 : [];

                          return (
                            <tr key={entry.id} className={isEditing ? "bg-indigo-50/40" : "hover:bg-gray-50/70"}>
                              <td className="px-4 py-3 text-gray-700">
                                {isEditing ? (
                                  <input type="date" className="w-36 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500" value={editingDraft.date} onChange={(event) => updateInlineDraft("date", event.target.value)} />
                                ) : (
                                  entry.date
                                )}
                              </td>
                              <td className="px-4 py-3 font-medium">
                                {isEditing ? (
                                  <select className="w-28 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500" value={editingDraft.category} onChange={(event) => updateInlineDraft("category", event.target.value)}>
                                    {EXPENSE_CATEGORIES.map((category) => (
                                      <option key={category} value={category}>{category}</option>
                                    ))}
                                  </select>
                                ) : (
                                  entry.category
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {isEditing ? (
                                  <select className="w-28 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500" value={editingDraft.subcategory} onChange={(event) => updateInlineDraft("subcategory", event.target.value)}>
                                    {rowSubcategories.map((subcategory) => (
                                      <option key={subcategory} value={subcategory}>{subcategory}</option>
                                    ))}
                                  </select>
                                ) : (
                                  entry.subcategory
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-indigo-600">
                                {isEditing ? (
                                  <input type="number" min="0" step="0.01" className="w-28 rounded-xl border border-gray-200 bg-white px-3 py-2 text-right text-sm font-semibold text-indigo-600 outline-none focus:border-indigo-500" value={editingDraft.amount} onChange={(event) => updateInlineDraft("amount", event.target.value)} />
                                ) : (
                                  <>¥{yuan(entry.amount)}</>
                                )}
                              </td>
                              <td className="max-w-[180px] px-4 py-3 text-gray-500">
                                {isEditing ? (
                                  <input className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500" value={editingDraft.note} onChange={(event) => updateInlineDraft("note", event.target.value)} />
                                ) : (
                                  <span className="block truncate">{entry.note || "-"}</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <div className="flex gap-2">
                                    <button type="button" onClick={saveInlineEdit} className={TABLE_BUTTON_CLASS}>保存</button>
                                    <button type="button" onClick={cancelInlineEdit} className={TABLE_BUTTON_CLASS}>取消</button>
                                  </div>
                                ) : (
                                  <div className="flex gap-2">
                                    <button type="button" onClick={() => startInlineEdit(entry)} className={ICON_BUTTON_CLASS} title="编辑"><Icon name="pencil" size={15} /></button>
                                    <button type="button" onClick={() => deleteEntry(entry.id)} className={ICON_BUTTON_CLASS} title="删除"><Icon name="trash" size={15} /></button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                    ) : (
                      <tr>
                        <td className="px-4 py-10 text-center text-gray-400" colSpan={6}>本月暂无支出记录。</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Panel>
        </section>
      </main>
    </div>
  );
}
