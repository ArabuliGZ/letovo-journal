import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertCircle, ArrowDown, ArrowRight, ArrowUp, BookOpen, CalendarDays, ChevronLeft, ChevronRight, Clock3, Download,
  FileSpreadsheet, Flag, GraduationCap, Pencil, Plus, Save, Trash2, Upload, X
} from "lucide-react";
import "./styles.css";

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: {
        name: string;
        title: string;
        description: string;
        inputSchema: object;
        annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
        execute: (input: unknown) => unknown;
      }, options?: { signal?: AbortSignal }) => void | Promise<void>;
    };
  }
}

type Tab = "journal" | "plan" | "schedule";
type Criterion = string;
type FinalCriterion = "A" | "B" | "C" | "D";
type MetaSkill = "selfManagement" | "criticalThinking" | "communication" | "collaboration";
type Lesson = { id: number; isoDate: string; date: string; short: string; weekday: string; topic: string; homework: string; homeworkDueDate: string; homeworkMinutes: number; criterion: Criterion; assessmentName: string };
type Student = { id: number; name: string; grades: Record<number, string>; criterionFinals: Record<FinalCriterion, string>; metaSkills?: Record<MetaSkill, string> };
type PlanRow = { id: number; unit: string; topic: string; hours: number; criterion: Criterion; assessmentName: string; homework: string; homeworkMinutes: number };
type SchoolClass = { id: string; name: string; level: string };
type Curriculum = { id: string; name: string; subject: string; level: string; classIds: string[]; rows: PlanRow[]; modules: string[] };
type NewCurriculum = { name: string; level: string; classIds: string[] };
type ClassJournal = { classId: string; students: Student[]; lessons: Lesson[] };

const SCHOOL_CLASSES: SchoolClass[] = [
  { id: "9f", name: "9Ф", level: "9 класс" }, { id: "9g", name: "9Г", level: "9 класс" },
  { id: "9a", name: "9А", level: "9 класс" }, { id: "9b", name: "9Б", level: "9 класс" },
  { id: "10v", name: "10В", level: "10 класс" }, { id: "10g", name: "10Г", level: "10 класс" }
];

const META_SKILLS: Array<{ id: MetaSkill; label: string; short: string }> = [
  { id: "selfManagement", label: "Самоорганизация", short: "Самоорганизация" },
  { id: "criticalThinking", label: "Критическое мышление", short: "Крит. мышление" },
  { id: "communication", label: "Коммуникация", short: "Коммуникация" },
  { id: "collaboration", label: "Сотрудничество", short: "Сотрудничество" }
];

const TOPICS = [
  "Механическое движение", "Система отсчёта. Траектория", "Путь и перемещение", "Равномерное движение",
  "Скорость", "Графики движения", "Средняя скорость", "Практикум по кинематике",
  "Ускорение", "Равноускоренное движение", "Скорость при равноускоренном движении", "Графики равноускоренного движения",
  "Свободное падение", "Движение тела, брошенного вертикально", "Движение по окружности", "Решение задач по кинематике",
  "Инерциальные системы отсчёта", "Первый закон Ньютона", "Второй закон Ньютона", "Третий закон Ньютона",
  "Сила упругости", "Сила трения", "Закон всемирного тяготения", "Практикум по динамике",
  "Импульс тела", "Закон сохранения импульса", "Реактивное движение", "Механическая работа",
  "Мощность", "Кинетическая энергия", "Потенциальная энергия", "Закон сохранения энергии",
  "Статика. Условия равновесия", "Момент силы", "Центр тяжести", "Лабораторная работа: равновесие рычага",
  "Механические колебания", "Период и частота колебаний", "Математический маятник", "Пружинный маятник",
  "Превращения энергии при колебаниях", "Резонанс", "Механические волны", "Длина и скорость волны",
  "Звуковые волны", "Высота и громкость звука", "Отражение звука. Эхо", "Практикум по колебаниям и волнам",
  "Электромагнитное поле", "Магнитное поле тока", "Действие магнитного поля", "Электромагнитная индукция",
  "Правило Ленца", "Генератор переменного тока", "Трансформатор", "Передача электроэнергии",
  "Электромагнитные волны", "Шкала электромагнитных волн", "Радиосвязь", "Свет как электромагнитная волна",
  "Обобщение материала семестра", "Практикум: комплексные задачи", "Итоговое оценивание", "Рефлексия и работа над ошибками"
];

const CRITERIA: Record<number, Criterion> = { 8: "A", 16: "B", 24: "C", 32: "D", 40: "F", 48: "A", 56: "B", 63: "C", 64: "D" };

function formatDate(date: Date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return { full: `${day}.${month}.2026`, short: `${day}.${month}`, iso: `2026-${month}-${day}` };
}

function makeLessons(): Lesson[] {
  const result: Omit<Lesson, "homeworkDueDate" | "homeworkMinutes">[] = [];
  const cursor = new Date(Date.UTC(2026, 8, 8));
  const end = new Date(Date.UTC(2026, 11, 24));
  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day === 2 || day === 4) {
      for (let pair = 0; pair < 2; pair++) {
        const id = result.length + 1;
        const formatted = formatDate(cursor);
        const criterion = CRITERIA[id] || "";
        result.push({ id, isoDate: formatted.iso, date: formatted.full, short: formatted.short, weekday: day === 2 ? "вт" : "чт", topic: TOPICS[id - 1], homework: id === 64 ? "Нет" : `§ ${id}, задачи ${id}.1–${id}.3`, criterion, assessmentName: criterion ? (criterion === "F" ? "Формирующая работа" : `Оценивание по критерию ${criterion}`) : "" });
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result.map(lesson => ({
    ...lesson,
    homeworkDueDate: result.find(next => next.id > lesson.id && next.isoDate !== lesson.isoDate)?.date || "",
    homeworkMinutes: lesson.homework === "Нет" ? 0 : 20 + (lesson.id % 4) * 5
  }));
}

const LESSONS = makeLessons();

const INITIAL_STUDENTS: Student[] = [
  { id: 1, name: "Александрова Мария", grades: { 8: "8", 16: "7", 24: "8", 32: "7", 40: "6", 48: "8", 56: "7" }, criterionFinals: { A: "8", B: "7", C: "8", D: "7" } },
  { id: 2, name: "Баранов Максим", grades: { 8: "6", 16: "5", 24: "6", 32: "7", 40: "5", 48: "7", 56: "6" }, criterionFinals: { A: "7", B: "6", C: "6", D: "7" } },
  { id: 3, name: "Волкова София", grades: { 8: "8", 16: "8", 24: "7", 32: "8", 40: "8", 48: "8", 56: "7" }, criterionFinals: { A: "8", B: "8", C: "7", D: "8" } },
  { id: 4, name: "Громов Артём", grades: { 8: "5", 16: "6", 24: "н", 32: "5", 40: "6", 48: "6", 56: "5" }, criterionFinals: { A: "6", B: "5", C: "5", D: "5" } },
  { id: 5, name: "Демидова Анна", grades: { 8: "7", 16: "8", 24: "7", 32: "7", 40: "7", 48: "8", 56: "8" }, criterionFinals: { A: "8", B: "8", C: "7", D: "7" } },
  { id: 6, name: "Егоров Михаил", grades: { 8: "4", 16: "5", 24: "6", 32: "5", 40: "5", 48: "6", 56: "5" }, criterionFinals: { A: "5", B: "5", C: "6", D: "5" } },
  { id: 7, name: "Зайцева Ева", grades: { 8: "8", 16: "7", 24: "8", 32: "8", 40: "8", 48: "7", 56: "8" }, criterionFinals: { A: "8", B: "8", C: "8", D: "8" } },
  { id: 8, name: "Ильин Роман", grades: { 8: "6", 16: "7", 24: "6", 32: "6", 40: "7", 48: "7", 56: "6" }, criterionFinals: { A: "7", B: "6", C: "6", D: "6" } }
];

const INITIAL_PLAN: PlanRow[] = LESSONS.map(lesson => ({
  id: lesson.id, unit: lesson.id <= 16 ? "Кинематика" : lesson.id <= 32 ? "Динамика" : lesson.id <= 48 ? "Статика и колебания" : "Электромагнитное поле", topic: lesson.topic, hours: 1, criterion: lesson.criterion,
  assessmentName: lesson.criterion ? (lesson.criterion === "F" ? "Формирующая работа" : `Критерий ${lesson.criterion}`) : "",
  homework: lesson.homework,
  homeworkMinutes: lesson.homework === "Нет" ? 0 : 20 + (lesson.id % 4) * 5
}));

function planVariant(suffix: string, unitNames: string[], count = 48): PlanRow[] {
  return INITIAL_PLAN.slice(0, count).map((row, index) => ({
    ...row,
    id: index + 1,
    unit: unitNames[Math.min(unitNames.length - 1, Math.floor(index / Math.ceil(count / unitNames.length)))],
    topic: suffix ? `${row.topic} · ${suffix}` : row.topic
  }));
}

const INITIAL_CURRICULA: Curriculum[] = [
  { id: "physics-9-base", name: "Физика 9 · Базовый уровень", subject: "Физика", level: "9 класс", classIds: ["9f", "9g"], rows: INITIAL_PLAN, modules: [...new Set(INITIAL_PLAN.map(row => row.unit))] },
  { id: "physics-9-advanced", name: "Физика 9 · Углублённый уровень", subject: "Физика", level: "9 класс", classIds: ["9a", "9b"], rows: planVariant("углублённый практикум", ["Кинематика", "Динамика", "Законы сохранения", "Колебания"], 56), modules: ["Кинематика", "Динамика", "Законы сохранения", "Колебания"] },
  { id: "physics-10-base", name: "Физика 10 · Базовый уровень", subject: "Физика", level: "10 класс", classIds: ["10v", "10g"], rows: planVariant("10 класс", ["Механика", "Молекулярная физика", "Термодинамика"], 48), modules: ["Механика", "Молекулярная физика", "Термодинамика"] }
];

const CLASS_STUDENT_NAMES: Record<string, string[]> = {
  "9f": INITIAL_STUDENTS.map(student => student.name),
  "9g": ["Абрамова Полина", "Белов Кирилл", "Васильев Матвей", "Голубева Дарья", "Дорофеев Иван", "Жукова Алиса", "Крылов Арсений", "Лебедева Варвара"],
  "9a": ["Андреева Елизавета", "Быков Александр", "Виноградова Мария", "Гаврилов Тимофей", "Ершова София", "Козлов Михаил", "Орлова Анна", "Соколов Роман"],
  "9b": ["Богданова Виктория", "Воробьёв Алексей", "Захарова Ксения", "Киселёв Даниил", "Макарова Ева", "Морозов Лев", "Новикова Арина", "Фёдоров Никита"],
  "10v": ["Алексеева Екатерина", "Борисов Андрей", "Григорьева Ольга", "Давыдов Степан", "Кузнецова Яна", "Мельников Павел", "Романова Алина", "Титов Игорь"],
  "10g": ["Антонова Милана", "Власов Георгий", "Ефимова Ульяна", "Комаров Денис", "Павлова Маргарита", "Смирнов Владислав", "Филиппова Надежда", "Яковлев Сергей"]
};

function normalizeHeader(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]/g, "");
}

function normalizeCriterion(value: unknown): Criterion {
  const text = String(value ?? "").toUpperCase()
    .replace(/А/g, "A").replace(/В/g, "B").replace(/С/g, "C").replace(/Д/g, "D").replace(/Ф/g, "F")
    .replace(/[^A-F]/g, "");
  if (text.includes("F")) return "F";
  return [...new Set(text.split("").filter(letter => "ABCD".includes(letter)))].join("");
}

function getColumn(row: Record<string, unknown>, aliases: string[]) {
  const wanted = aliases.map(normalizeHeader);
  const entry = Object.entries(row).find(([key]) => wanted.includes(normalizeHeader(key)));
  return entry?.[1];
}

function dateToIso(value: string) {
  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

function isoToDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : value;
}

async function parsePlanFile(file: File): Promise<PlanRow[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("В файле нет листов");
  const source = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
  const rows: PlanRow[] = [];
  let currentUnit = "";
  for (const item of source) {
    const topic = String(getColumn(item, ["Тема", "Тема урока"]) ?? "").trim();
    if (!topic) continue;
    const unit = String(getColumn(item, ["Unit", "Модуль", "Юнит", "Раздел"]) ?? "").trim();
    if (unit) currentUnit = unit;
    const hours = Math.max(1, Number(getColumn(item, ["Число уроков", "Часы", "Количество часов"])) || 1);
    const criterion = normalizeCriterion(getColumn(item, ["Оценивание", "Критерий"]));
    rows.push({
      id: rows.length + 1,
      unit: currentUnit || "Без модуля",
      topic,
      hours,
      criterion,
      assessmentName: String(getColumn(item, ["Название оценивания"]) ?? "").trim(),
      homework: String(getColumn(item, ["ДЗ", "Домашнее задание"]) ?? "").trim(),
      homeworkMinutes: Math.max(0, Number(getColumn(item, ["Рассчетное время ДЗ", "Расчетное время ДЗ", "Время ДЗ", "Время на ДЗ"])) || 0)
    });
  }
  if (!rows.length) throw new Error("Не найдены строки с темами уроков");
  return rows;
}

function loadState<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "") as T; } catch { return fallback; }
}

function loadStudents(): Student[] {
  const saved = loadState<Array<Partial<Student> & Pick<Student, "id" | "name" | "grades">>>("journal-students-v2", INITIAL_STUDENTS);
  return saved.map(student => ({
    ...student,
    criterionFinals: student.criterionFinals || INITIAL_STUDENTS.find(item => item.id === student.id)?.criterionFinals || { A: "", B: "", C: "", D: "" }
  }));
}

function loadCurricula(): Curriculum[] {
  const saved = loadState<Curriculum[]>("journal-curricula-v1", []);
  if (saved.length) return saved;
  const legacyRows = loadState("journal-plan-v5", INITIAL_PLAN);
  const legacyModules = loadState<string[]>("journal-modules-v1", [...new Set(legacyRows.map(row => row.unit).filter(Boolean))]);
  return [{ ...INITIAL_CURRICULA[0], rows: legacyRows, modules: legacyModules }, ...INITIAL_CURRICULA.slice(1)];
}

function applyPlanRows(lessons: Lesson[], rows: PlanRow[]): Lesson[] {
  if (!rows.length) return lessons;
  const sequence = rows.flatMap(row => Array.from({ length: row.hours }, (_, topicLessonIndex) => ({
    row,
    topicLessonIndex,
    topicLessonCount: row.hours
  })));
  return lessons.map((lesson, index) => {
    const slot = sequence[index];
    if (!slot) return lesson;
    const { row, topicLessonIndex, topicLessonCount } = slot;
    const isLastTopicLesson = topicLessonIndex === topicLessonCount - 1;
    const splitCriterion = row.criterion === "BC" && topicLessonCount >= 2
      ? (topicLessonIndex === 0 ? "B" : topicLessonIndex === 1 ? "C" : "")
      : row.criterion;
    return {
      ...lesson,
      topic: row.topic,
      homework: isLastTopicLesson ? row.homework : "",
      homeworkMinutes: isLastTopicLesson ? row.homeworkMinutes : 0,
      criterion: splitCriterion,
      assessmentName: splitCriterion ? row.assessmentName : ""
    };
  });
}

function lessonsForCurriculum(curriculum?: Curriculum): Lesson[] {
  const blankLessons = LESSONS.map(lesson => ({
    ...lesson,
    topic: "",
    homework: "",
    homeworkMinutes: 0,
    criterion: "",
    assessmentName: ""
  }));
  return curriculum ? applyPlanRows(blankLessons, curriculum.rows) : blankLessons;
}

function demoStudents(classId: string, classIndex: number): Student[] {
  const names = CLASS_STUDENT_NAMES[classId] || CLASS_STUDENT_NAMES["9f"];
  return INITIAL_STUDENTS.map((template, index) => {
    const shift = ((classIndex + index) % 3) - 1;
    const adjust = (value: string) => value === "н" ? value : String(Math.max(0, Math.min(8, Number(value) + shift)));
    return {
      ...template,
      name: names[index] || template.name,
      grades: Object.fromEntries(Object.entries(template.grades).map(([lessonId, value]) => [lessonId, adjust(value)])),
      criterionFinals: Object.fromEntries(Object.entries(template.criterionFinals).map(([criterion, value]) => [criterion, adjust(value)])) as Record<FinalCriterion, string>
    };
  });
}

function loadClassJournals(curricula: Curriculum[]): ClassJournal[] {
  const current = loadState<ClassJournal[]>("journal-class-journals-v2", []);
  if (current.length) return current;
  const saved = loadState<ClassJournal[]>("journal-class-journals-v1", []);
  if (saved.length) return saved.map(journal => {
    const curriculum = curricula.find(item => item.classIds.includes(journal.classId));
    const lessons = curriculum ? applyPlanRows(journal.lessons, curriculum.rows) : journal.lessons;
    return { ...journal, lessons: lessons.map(lesson => ({ ...lesson, assessmentName: lesson.assessmentName || (lesson.criterion ? (lesson.criterion === "F" ? "Формирующая работа" : `Оценивание по критерию ${lesson.criterion}`) : "") })) };
  });
  const legacyStudents = loadStudents();
  const legacyLessons = loadState("journal-lessons-v3", LESSONS);
  return SCHOOL_CLASSES.map((schoolClass, index) => ({
    classId: schoolClass.id,
    students: schoolClass.id === "9f" ? legacyStudents : demoStudents(schoolClass.id, index),
    lessons: schoolClass.id === "9f" ? legacyLessons.map(lesson => ({ ...lesson, assessmentName: lesson.assessmentName || (lesson.criterion ? (lesson.criterion === "F" ? "Формирующая работа" : `Оценивание по критерию ${lesson.criterion}`) : "") })) : lessonsForCurriculum(curricula.find(curriculum => curriculum.classIds.includes(schoolClass.id)))
  }));
}

function App() {
  const [tab, setTab] = useState<Tab>("journal");
  const [curricula, setCurricula] = useState(loadCurricula);
  const [classJournals, setClassJournals] = useState(() => loadClassJournals(curricula));
  const [activeClassId, setActiveClassId] = useState(() => loadState("journal-active-class-v1", "9f"));
  const [activeCurriculumId, setActiveCurriculumId] = useState(() => loadState("journal-active-curriculum-v1", "physics-9-base"));
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [editingPlan, setEditingPlan] = useState<PlanRow | null>(null);
  const [newModuleName, setNewModuleName] = useState<string | null>(null);
  const [newCurriculum, setNewCurriculum] = useState<NewCurriculum | null>(null);
  const [addingClassIds, setAddingClassIds] = useState<string[] | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [importName, setImportName] = useState("");
  const [importStatus, setImportStatus] = useState("");

  useEffect(() => localStorage.setItem("journal-class-journals-v2", JSON.stringify(classJournals)), [classJournals]);
  useEffect(() => localStorage.setItem("journal-active-class-v1", JSON.stringify(activeClassId)), [activeClassId]);
  useEffect(() => localStorage.setItem("journal-curricula-v1", JSON.stringify(curricula)), [curricula]);
  useEffect(() => localStorage.setItem("journal-active-curriculum-v1", JSON.stringify(activeCurriculumId)), [activeCurriculumId]);

  const activeClass = SCHOOL_CLASSES.find(item => item.id === activeClassId) || SCHOOL_CLASSES[0];
  const activeJournal = classJournals.find(item => item.classId === activeClass.id) || classJournals[0];
  const students = activeJournal?.students || [];
  const lessons = activeJournal?.lessons || [];
  const setStudents = (next: (items: Student[]) => Student[]) => setClassJournals(items => items.map(journal => journal.classId === activeClass.id ? { ...journal, students: next(journal.students) } : journal));
  const setLessons = (next: (items: Lesson[]) => Lesson[]) => setClassJournals(items => items.map(journal => journal.classId === activeClass.id ? { ...journal, lessons: next(journal.lessons) } : journal));
  const activeCurriculum = curricula.find(item => item.id === activeCurriculumId) || curricula[0];
  const linkedCurriculum = curricula.find(item => item.classIds.includes(activeClass.id));
  const plan = activeCurriculum?.rows || [];
  const modules = activeCurriculum?.modules || [];
  const setPlan = (next: PlanRow[] | ((items: PlanRow[]) => PlanRow[])) => {
    if (!activeCurriculum) return;
    const nextRows = typeof next === "function" ? next(plan) : next;
    setCurricula(items => items.map(curriculum => curriculum.id === activeCurriculum.id ? { ...curriculum, rows: nextRows } : curriculum));
  };
  const setModules = (next: string[] | ((items: string[]) => string[])) => setCurricula(items => items.map(curriculum => curriculum.id === activeCurriculum?.id
    ? { ...curriculum, modules: typeof next === "function" ? next(curriculum.modules) : next }
    : curriculum));

  const setGrade = (studentId: number, lessonId: number, value: string) => {
    const clean = value.toLowerCase().replace(/[^0-8н]/g, "").slice(-1);
    setStudents(items => items.map(s => s.id === studentId ? { ...s, grades: { ...s.grades, [lessonId]: clean } } : s));
  };

  const setCriterionFinal = (studentId: number, criterion: FinalCriterion, value: string) => {
    const clean = value.replace(/[^0-8]/g, "").slice(-1);
    setStudents(items => items.map(student => student.id === studentId
      ? { ...student, criterionFinals: { ...student.criterionFinals, [criterion]: clean } }
      : student));
  };

  const setMetaSkill = (studentId: number, skill: MetaSkill, value: string) => {
    const clean = value.replace(/[^0-4]/g, "").slice(-1);
    setStudents(items => items.map(student => student.id === studentId
      ? { ...student, metaSkills: { selfManagement: "", criticalThinking: "", communication: "", collaboration: "", ...student.metaSkills, [skill]: clean } }
      : student));
  };

  const saveLesson = (lesson: Lesson) => {
    setLessons(items => items.map(x => x.id === lesson.id ? lesson : x));
    setSelectedLesson(null);
  };

  const setLessonTopic = (lessonId: number, topic: string) => {
    setLessons(items => items.map(lesson => lesson.id === lessonId ? { ...lesson, topic } : lesson));
  };

  const savePlan = () => {
    if (!editingPlan) return;
    setPlan(items => {
      if (items.some(x => x.id === editingPlan.id)) return items.map(x => x.id === editingPlan.id ? editingPlan : x);
      const lastModuleIndex = items.reduce((last, row, index) => row.unit === editingPlan.unit ? index : last, -1);
      if (lastModuleIndex < 0) return [...items, editingPlan];
      const next = [...items];
      next.splice(lastModuleIndex + 1, 0, editingPlan);
      return next;
    });
    setEditingPlan(null);
  };

  const createCurriculum = () => {
    if (!newCurriculum?.name.trim()) return;
    const id = `curriculum-${Date.now()}`;
    const classIds = newCurriculum.classIds.filter(classId => SCHOOL_CLASSES.some(item => item.id === classId && item.level === newCurriculum.level));
    const curriculum: Curriculum = { id, name: newCurriculum.name.trim(), subject: "Физика", level: newCurriculum.level, classIds, rows: [], modules: ["Новый модуль"] };
    setCurricula(items => [...items.map(item => ({ ...item, classIds: item.classIds.filter(classId => !curriculum.classIds.includes(classId)) })), curriculum]);
    const replacementLessons = lessonsForCurriculum(curriculum);
    setClassJournals(items => items.map(journal => curriculum.classIds.includes(journal.classId)
      ? { ...journal, lessons: replacementLessons.map(lesson => ({ ...lesson })) }
      : journal));
    setActiveCurriculumId(id);
    setNewCurriculum(null);
    setImportName("");
    setImportStatus("");
  };

  const selectCurriculum = (id: string) => {
    setActiveCurriculumId(id);
    setImportName("");
    setImportStatus("");
    setEditingPlan(null);
  };

  const addClassesToCurriculum = () => {
    if (!activeCurriculum || addingClassIds === null) return;
    const allowedClassIds = new Set(SCHOOL_CLASSES.filter(item => item.level === activeCurriculum.level).map(item => item.id));
    const selected = [...new Set(addingClassIds)].filter(classId => allowedClassIds.has(classId));
    const newlyAdded = selected.filter(classId => !activeCurriculum.classIds.includes(classId));
    setCurricula(items => items.map(curriculum => curriculum.id === activeCurriculum.id
      ? { ...curriculum, classIds: selected }
      : { ...curriculum, classIds: curriculum.classIds.filter(classId => !selected.includes(classId)) }));
    if (newlyAdded.length) {
      const replacementLessons = lessonsForCurriculum(activeCurriculum);
      setClassJournals(items => items.map(journal => newlyAdded.includes(journal.classId)
        ? { ...journal, lessons: replacementLessons.map(lesson => ({ ...lesson })) }
        : journal));
    }
    setAddingClassIds(null);
  };

  const addPlanRow = () => setEditingPlan({ id: Math.max(0, ...plan.map(row => row.id)) + 1, unit: plan[0]?.unit || "Новый модуль", topic: "", hours: 1, criterion: "", assessmentName: "", homework: "", homeworkMinutes: 0 });

  const addModule = () => {
    const name = newModuleName?.trim();
    if (!name) return;
    if (!modules.includes(name)) setModules(items => [...items, name]);
    setNewModuleName(null);
  };

  const moveModule = (name: string, direction: -1 | 1) => setModules(items => {
    const index = items.indexOf(name);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return items;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  const deletePlanRow = (id: number) => setPlan(items => {
    const index = items.findIndex(row => row.id === id);
    if (index < 0) return items;
    return items.filter(row => row.id !== id);
  });

  const movePlanRow = (id: number, direction: -1 | 1) => setPlan(items => {
    const index = items.findIndex(row => row.id === id);
    if (index < 0) return items;
    const moduleRows = items.filter(row => row.unit === items[index].unit);
    const moduleIndex = moduleRows.findIndex(row => row.id === id);
    const targetRow = moduleRows[moduleIndex + direction];
    if (!targetRow) return items;
    const target = items.findIndex(row => row.id === targetRow.id);
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  const importPlan = async (file?: File) => {
    if (!file) return;
    setImportName(file.name);
    setImportStatus("Читаю файл…");
    try {
      const imported = await parsePlanFile(file);
      setPlan(imported);
      setModules([...new Set(imported.map(row => row.unit).filter(Boolean))]);
      setImportStatus(`Загружено: ${imported.length} тем, ${imported.reduce((sum, row) => sum + row.hours, 0)} уроков`);
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : "Не удалось прочитать файл");
    }
  };

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: Parameters<typeof context.registerTool>[0]) => {
      try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined); } catch { /* unsupported preview */ }
    };
    register({
      name: "set_student_grade",
      title: "Поставить оценку",
      description: "Ставит или очищает оценку ученика за выбранный урок в демонстрационном журнале.",
      inputSchema: {
        type: "object",
        properties: { studentId: { type: "number" }, lessonId: { type: "number" }, grade: { type: "string", enum: ["", "0", "1", "2", "3", "4", "5", "6", "7", "8", "н"] } },
        required: ["studentId", "lessonId", "grade"], additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const data = input as { studentId?: number; lessonId?: number; grade?: string };
        if (!students.some(s => s.id === data.studentId) || !lessons.some(l => l.id === data.lessonId) || !["", "0", "1", "2", "3", "4", "5", "6", "7", "8", "н"].includes(data.grade ?? "?")) throw new Error("Некорректный ученик, урок или оценка");
        setGrade(data.studentId!, data.lessonId!, data.grade!);
        setTab("journal");
        return { updated: true, studentId: data.studentId, lessonId: data.lessonId, grade: data.grade };
      }
    });
    register({
      name: "set_criterion_final",
      title: "Выставить итог за критерий",
      description: "Ставит или очищает итоговый балл 0–8 за критерий A, B, C или D.",
      inputSchema: {
        type: "object",
        properties: {
          studentId: { type: "number" },
          criterion: { type: "string", enum: ["A", "B", "C", "D"] },
          score: { type: "string", enum: ["", "0", "1", "2", "3", "4", "5", "6", "7", "8"] }
        },
        required: ["studentId", "criterion", "score"], additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const data = input as { studentId?: number; criterion?: FinalCriterion; score?: string };
        if (!students.some(student => student.id === data.studentId) || !data.criterion || !["A", "B", "C", "D"].includes(data.criterion) || !["", "0", "1", "2", "3", "4", "5", "6", "7", "8"].includes(data.score ?? "?")) throw new Error("Некорректный ученик, критерий или балл");
        setCriterionFinal(data.studentId!, data.criterion, data.score!);
        setTab("journal");
        return { updated: true, studentId: data.studentId, criterion: data.criterion, score: data.score };
      }
    });
    register({
      name: "update_lesson_details",
      title: "Обновить урок",
      description: "Изменяет тему и домашнее задание существующего урока.",
      inputSchema: {
        type: "object",
        properties: { lessonId: { type: "number" }, topic: { type: "string" }, homework: { type: "string" }, homeworkDueDate: { type: "string", description: "Дата в формате ДД.ММ.ГГГГ" }, homeworkMinutes: { type: "number", minimum: 0 }, criterion: { type: "string", enum: ["", "A", "B", "C", "D", "BC", "F"] }, assessmentName: { type: "string" } },
        required: ["lessonId", "topic", "homework"], additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const data = input as { lessonId?: number; topic?: string; homework?: string; homeworkDueDate?: string; homeworkMinutes?: number; criterion?: string; assessmentName?: string };
        const lesson = lessons.find(l => l.id === data.lessonId);
        if (!lesson || !data.topic?.trim() || typeof data.homework !== "string") throw new Error("Урок не найден или поля заполнены неверно");
        saveLesson({ ...lesson, topic: data.topic.trim(), homework: data.homework.trim(), homeworkDueDate: data.homeworkDueDate ?? lesson.homeworkDueDate, homeworkMinutes: data.homeworkMinutes ?? lesson.homeworkMinutes, criterion: data.criterion ?? lesson.criterion, assessmentName: data.assessmentName ?? lesson.assessmentName });
        setTab("journal");
        return { updated: true, lessonId: data.lessonId, topic: data.topic.trim() };
      }
    });
    return () => lifecycle.abort();
  }, [students, lessons]);

  const tabMeta = {
    journal: ["Журнал", `Оценки и посещаемость · ${activeClass.name} класс`],
    plan: ["КТП", "Контрольно-тематический план · Физика, 9 класс"],
    schedule: ["Расписание", "Учебная неделя · 2026/2027"]
  } as const;

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><GraduationCap size={21} /></div>
        <div><strong>Летово · Физика</strong><span>Кабинет учителя</span></div>
      </div>
      <nav className="tabs" aria-label="Разделы журнала">
        <button className={tab === "journal" ? "active" : ""} onClick={() => setTab("journal")}><BookOpen size={16}/>Журнал</button>
        <button className={tab === "plan" ? "active" : ""} onClick={() => setTab("plan")}><FileSpreadsheet size={16}/>КТП</button>
        <button className={tab === "schedule" ? "active" : ""} onClick={() => setTab("schedule")}><CalendarDays size={16}/>Расписание</button>
      </nav>
      <div className="user-block"><span>ГА</span><div><strong>Георгий Арабули</strong><small>Учитель</small></div></div>
    </header>

    <main>
      <div className="page-heading">
        <div><h1>{tabMeta[tab][0]}</h1><p>{tabMeta[tab][1]}</p></div>
        {tab === "journal" && <div className="selectors"><label>Класс<select value={activeClass.id} onChange={event => { setActiveClassId(event.target.value); setSelectedLesson(null); }}>{SCHOOL_CLASSES.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Предмет<select><option>Физика</option></select></label></div>}
      </div>

      {tab === "journal" && <Journal className={activeClass.name} curriculumName={linkedCurriculum?.name} students={students} lessons={lessons} plannedLessons={lessonsForCurriculum(linkedCurriculum)} setGrade={setGrade} setCriterionFinal={setCriterionFinal} setMetaSkill={setMetaSkill} setLessonTopic={setLessonTopic} onLesson={setSelectedLesson} />}
      {tab === "plan" && <Plan curricula={curricula} activeCurriculum={activeCurriculum} classes={SCHOOL_CLASSES} onSelect={selectCurriculum} onCreate={()=>setNewCurriculum({ name: "", level: "9 класс", classIds: [] })} onAddClass={()=>setAddingClassIds(activeCurriculum?.classIds || [])} rows={plan} modules={modules} onEdit={setEditingPlan} onAdd={addPlanRow} onAddModule={()=>setNewModuleName("")} onDelete={deletePlanRow} onMove={movePlanRow} onMoveModule={moveModule} importName={importName} importStatus={importStatus} onImport={importPlan} />}
      {tab === "schedule" && <Schedule weekOffset={weekOffset} setWeekOffset={setWeekOffset} lessons={lessons} className={activeClass.name} />}
    </main>

    {selectedLesson && <LessonDialog lesson={selectedLesson} className={activeClass.name} onClose={() => setSelectedLesson(null)} onSave={saveLesson} />}
    {editingPlan && <PlanDialog row={editingPlan} setRow={setEditingPlan} modules={modules} onClose={() => setEditingPlan(null)} onSave={savePlan} />}
    {newModuleName !== null && <ModuleDialog name={newModuleName} setName={setNewModuleName} onClose={()=>setNewModuleName(null)} onSave={addModule} />}
    {newCurriculum && <CurriculumDialog draft={newCurriculum} setDraft={setNewCurriculum} classes={SCHOOL_CLASSES} onClose={()=>setNewCurriculum(null)} onSave={createCurriculum} />}
    {addingClassIds && activeCurriculum && <AddClassesDialog selected={addingClassIds} setSelected={setAddingClassIds} attached={activeCurriculum.classIds} classes={SCHOOL_CLASSES} curricula={curricula} curriculumLevel={activeCurriculum.level} onClose={()=>setAddingClassIds(null)} onSave={addClassesToCurriculum} />}
  </div>;
}

function Journal({ className, curriculumName, students, lessons, plannedLessons, setGrade, setCriterionFinal, setMetaSkill, setLessonTopic, onLesson }: { className:string; curriculumName?:string; students: Student[]; lessons: Lesson[]; plannedLessons:Lesson[]; setGrade: (s:number,l:number,v:string)=>void; setCriterionFinal: (s:number,c:FinalCriterion,v:string)=>void; setMetaSkill:(s:number,m:MetaSkill,v:string)=>void; setLessonTopic:(lessonId:number,topic:string)=>void; onLesson:(l:Lesson)=>void }) {
  const [journalView, setJournalView] = useState<"grades" | "topics">("grades");
  const criteria: FinalCriterion[] = ["A", "B", "C", "D"];
  const monthNames = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
  const monthGroups = lessons.reduce<Array<{ key: string; name: string; count: number }>>((groups, lesson) => {
    const key = lesson.isoDate.slice(0, 7);
    const current = groups.at(-1);
    if (current?.key === key) current.count += 1;
    else groups.push({ key, name: monthNames[Number(lesson.isoDate.slice(5, 7)) - 1], count: 1 });
    return groups;
  }, []);
  const hasHomework = (lesson: Lesson) => Boolean(lesson.homework.trim()) && lesson.homework.trim().toLowerCase() !== "нет";
  const homeworkDueDates = new Set(lessons.filter(hasHomework).map(lesson => dateToIso(lesson.homeworkDueDate)).filter(Boolean));
  const moveGradeFocus = (event: React.KeyboardEvent<HTMLInputElement>, row: number, column: number) => {
    const directions: Partial<Record<string, [number, number]>> = {
      ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0]
    };
    const direction = directions[event.key];
    if (!direction) return;
    const nextRow = row + direction[0];
    const nextColumn = column + direction[1];
    const target = document.querySelector<HTMLInputElement>(`input[data-grade-row="${nextRow}"][data-grade-column="${nextColumn}"]`);
    if (!target) return;
    event.preventDefault();
    target.focus();
    target.select();
    target.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  const averageFor = (student: Student, criterion: FinalCriterion) => {
    const ids = lessons.filter(l => l.criterion !== "F" && l.criterion.includes(criterion)).map(l => l.id);
    const values = ids.flatMap(id => {
      const raw = student.grades[id];
      return raw !== undefined && raw !== "" && raw !== "н" ? [Number(raw)] : [];
    });
    return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1) : "—";
  };
  const finalSum = (student: Student) => {
    const values = criteria.map(criterion => student.criterionFinals[criterion]);
    return values.every(value => value !== "") ? values.reduce((sum, value) => sum + Number(value), 0) : null;
  };
  const semesterGrade = (sum: number | null) => {
    if (sum === null || sum < 1) return "—";
    if (sum <= 5) return "1";
    if (sum <= 9) return "2";
    if (sum <= 14) return "3";
    if (sum <= 18) return "4";
    if (sum <= 23) return "5";
    if (sum <= 27) return "6";
    return "7";
  };
  return <div className="journal-workspace"><div className="journal-subtabs" role="tablist" aria-label="Раздел журнала"><button className={journalView === "grades" ? "active" : ""} role="tab" aria-selected={journalView === "grades"} onClick={() => setJournalView("grades")}>Оценки</button><button className={journalView === "topics" ? "active" : ""} role="tab" aria-selected={journalView === "topics"} onClick={() => setJournalView("topics")}>Темы уроков</button></div>{journalView === "topics" ? <LessonTopics className={className} curriculumName={curriculumName} lessons={lessons} plannedLessons={plannedLessons} onTopicChange={setLessonTopic} onLesson={onLesson}/> : <section className="panel journal-panel">
    <div className="panel-head"><div><strong>{className} · 1 семестр</strong><span>8 сентября — 24 декабря · {lessons.length} урока · {curriculumName ? `КТП: ${curriculumName}` : "КТП не назначен"}</span></div><div className="legend"><span><b className="criterion-badge criterion-a">A</b>Знание</span><span><b className="criterion-badge criterion-b">B</b>Исследование</span><span><b className="criterion-badge criterion-c">C</b>Коммуникация</span><span><b className="criterion-badge criterion-d">D</b>Применение</span><span><b className="criterion-badge criterion-f">F</b>Формирующее</span></div></div>
    <div className="table-scroll"><table className="journal-table"><thead>
      <tr className="month-row"><th className="student sticky" rowSpan={2}>Ученик</th>{monthGroups.map(month => <th className="month-heading" colSpan={month.count} key={month.key}>{month.name}</th>)}<th className="criterion-section average-section" colSpan={4}>Средние баллы</th><th className="criterion-section final-section" colSpan={4}>Итог за критерий</th><th className="total-heading" rowSpan={2}>Сумма</th><th className="semester-heading" rowSpan={2}>Семестр</th><th className="meta-section" colSpan={4}>Метапредметные навыки · 0–4</th></tr>
      <tr>{lessons.map((lesson, index) => {
        const topicMissing = !lesson.topic.trim();
        const homeworkAssigned = hasHomework(lesson);
        const homeworkDue = homeworkDueDates.has(lesson.isoDate) && lessons.findIndex(item => item.isoDate === lesson.isoDate) === index;
        return <th className={`lesson-heading${topicMissing ? " no-topic-heading" : ""}`} key={lesson.id}><button className="date-button" title={topicMissing ? `${lesson.date}: тема не указана` : `${lesson.date}: ${lesson.topic}`} onClick={() => onLesson(lesson)}><span>{lesson.isoDate.slice(-2)}</span><small>{lesson.weekday}{lesson.criterion && <b className={`mini-criterion criterion-${lesson.criterion.toLowerCase()}`}>{lesson.criterion}</b>}</small><span className="lesson-markers">{topicMissing && <AlertCircle size={11} className="lesson-marker missing-topic-marker" aria-label="Тема не указана"/>}{homeworkAssigned && <ArrowRight size={12} className="lesson-marker homework-assigned-marker" aria-label="В этот урок задано домашнее задание"/>}{homeworkDue && <Flag size={11} className="lesson-marker homework-due-marker" aria-label="На этот день задано домашнее задание"/>}</span></button></th>;
      })}{criteria.map(criterion => <th className={`summary-head criterion-${criterion.toLowerCase()}`} key={`${criterion}-average`}>Ср. {criterion}</th>)}{criteria.map(criterion => <th className={`summary-head final-head criterion-${criterion.toLowerCase()}`} key={`${criterion}-final`}>Итог {criterion}</th>)}{META_SKILLS.map(skill => <th className="meta-heading" title={skill.label} key={skill.id}>{skill.short}</th>)}</tr>
    </thead>
    <tbody>{students.map((student, idx) => {
      const sum = finalSum(student);
      return <tr key={student.id}><td className="student sticky"><span className="row-number">{idx+1}</span>{student.name}</td>{lessons.map((lesson, lessonIndex) => <td key={lesson.id} className={!lesson.criterion ? "no-assessment" : ""}><input inputMode="numeric" data-grade-row={idx} data-grade-column={lessonIndex} aria-label={`${student.name}, ${lesson.date}${lesson.criterion ? `, критерий ${lesson.criterion}` : ", без оценивания"}`} className={`grade-input score-${student.grades[lesson.id] || "empty"}`} value={student.grades[lesson.id] || ""} onKeyDown={event => moveGradeFocus(event, idx, lessonIndex)} onChange={event=>setGrade(student.id,lesson.id,event.target.value)} /></td>)}{criteria.map(criterion => <td className="summary-cell" key={`${criterion}-average`}><strong className={`criterion-average criterion-${criterion.toLowerCase()}`}>{averageFor(student,criterion)}</strong></td>)}{criteria.map((criterion, criterionIndex) => {
        const column = lessons.length + criterionIndex;
        return <td className="summary-cell final-cell" key={`${criterion}-final`}><input inputMode="numeric" data-grade-row={idx} data-grade-column={column} aria-label={`${student.name}, итог за критерий ${criterion}`} className={`final-score-input score-${student.criterionFinals[criterion] || "empty"}`} value={student.criterionFinals[criterion]} onKeyDown={event => moveGradeFocus(event, idx, column)} onChange={event => setCriterionFinal(student.id, criterion, event.target.value)} /></td>;
      })}<td className="sum-cell">{sum ?? "—"}</td><td className="semester-cell"><strong>{semesterGrade(sum)}</strong></td>{META_SKILLS.map((skill, skillIndex) => {
        const column = lessons.length + criteria.length + skillIndex;
        return <td className="meta-cell" key={skill.id}><input inputMode="numeric" data-grade-row={idx} data-grade-column={column} aria-label={`${student.name}, ${skill.label}`} className={`meta-score-input meta-score-${student.metaSkills?.[skill.id] || "empty"}`} value={student.metaSkills?.[skill.id] || ""} onKeyDown={event => moveGradeFocus(event, idx, column)} onChange={event => setMetaSkill(student.id, skill.id, event.target.value)}/></td>;
      })}</tr>;
    })}</tbody></table></div>
    <div className="panel-foot"><span>Оценку 0–8 или «н» можно поставить за любой урок</span><span className="journal-mark-legend"><b><ArrowRight size={13}/>ДЗ задано</b><b><Flag size={12}/>ДЗ сдать</b><b><AlertCircle size={12}/>Нет темы</b></span><span>Средние считаются по A–D; итог за критерий выставляет учитель</span></div>
  </section>}</div>;
}

function LessonTopics({ className, curriculumName, lessons, plannedLessons, onTopicChange, onLesson }: { className:string; curriculumName?:string; lessons:Lesson[]; plannedLessons:Lesson[]; onTopicChange:(lessonId:number,topic:string)=>void; onLesson:(lesson:Lesson)=>void }) {
  const plannedById = new Map(plannedLessons.map(lesson => [lesson.id, lesson]));
  const normalized = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
  return <section className="panel topics-panel"><div className="panel-head topics-panel-head"><div><strong>{className} · темы уроков</strong><span>{curriculumName ? `Сравнение с КТП: ${curriculumName}` : "КТП не назначен"}</span></div><span className="topics-save-note"><Save size={14}/>Изменения сохраняются автоматически</span></div><div className="table-scroll"><table className="topics-table"><thead><tr><th>Дата</th><th>Урок</th><th>По КТП</th><th>По факту</th><th>Статус</th></tr></thead><tbody>{lessons.map((lesson, index) => {
    const plannedTopic = plannedById.get(lesson.id)?.topic || "";
    const lessonInDay = lessons.slice(0, index + 1).filter(item => item.isoDate === lesson.isoDate).length;
    const lessonNumber = lesson.weekday === "вт" ? lessonInDay : lessonInDay + 7;
    const status = !lesson.topic.trim() ? "empty" : !plannedTopic.trim() ? "outside" : normalized(lesson.topic) === normalized(plannedTopic) ? "match" : "changed";
    const statusLabel = status === "empty" ? "Не заполнено" : status === "outside" ? "Вне КТП" : status === "match" ? "По плану" : "Изменено";
    return <tr key={lesson.id}><td><button className="topics-date-button" onClick={() => onLesson(lesson)}><b>{lesson.short}</b><small>{lesson.weekday}</small></button></td><td className="topics-lesson-number">{lessonNumber}</td><td className="planned-topic">{plannedTopic || <span>Тема не указана</span>}</td><td><textarea aria-label={`${lesson.date}, тема по факту`} value={lesson.topic} placeholder="Введите фактическую тему" onChange={event => onTopicChange(lesson.id, event.target.value)}/></td><td><span className={`topic-status topic-status-${status}`}>{statusLabel}</span></td></tr>;
  })}</tbody></table></div></section>;
}

function Plan({ curricula, activeCurriculum, classes, onSelect, onCreate, onAddClass, rows, modules, onEdit, onAdd, onAddModule, onDelete, onMove, onMoveModule, importName, importStatus, onImport }: { curricula:Curriculum[]; activeCurriculum?:Curriculum; classes:SchoolClass[]; onSelect:(id:string)=>void; onCreate:()=>void; onAddClass:()=>void; rows: PlanRow[]; modules:string[]; onEdit:(r:PlanRow)=>void; onAdd:()=>void; onAddModule:()=>void; onDelete:(id:number)=>void; onMove:(id:number,direction:-1|1)=>void; onMoveModule:(name:string,direction:-1|1)=>void; importName:string; importStatus:string; onImport:(file?:File)=>void }) {
  const [classFilter, setClassFilter] = useState("");
  const visibleModules = [...new Set([...modules, ...rows.map(row=>row.unit).filter(Boolean)])];
  const orderedRows = visibleModules.flatMap(module => rows.filter(row => row.unit === module));
  const attachedClasses = classes.filter(item => activeCurriculum?.classIds.includes(item.id));
  const filteredCurricula = classFilter ? curricula.filter(curriculum => curriculum.classIds.includes(classFilter)) : curricula;
  useEffect(() => {
    if (!classFilter) return;
    if (!filteredCurricula.length) setClassFilter("");
    else if (!filteredCurricula.some(curriculum => curriculum.id === activeCurriculum?.id)) onSelect(filteredCurricula[0].id);
  }, [classFilter, curricula, activeCurriculum?.id]);
  const changeClassFilter = (classId: string) => {
    setClassFilter(classId);
    const firstMatch = classId ? curricula.find(curriculum => curriculum.classIds.includes(classId)) : curricula[0];
    if (firstMatch) onSelect(firstMatch.id);
  };
  return <><section className="plan-picker"><div className="plan-picker-main"><label>Фильтр по классу<select className="class-filter" value={classFilter} onChange={event => changeClassFilter(event.target.value)}><option value="">Все классы</option>{classes.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Выбранный КТП<select value={filteredCurricula.some(item => item.id === activeCurriculum?.id) ? activeCurriculum?.id : ""} onChange={event => onSelect(event.target.value)}>{filteredCurricula.length ? filteredCurricula.map(curriculum => <option value={curriculum.id} key={curriculum.id}>{curriculum.name}</option>) : <option value="">Нет привязанных КТП</option>}</select></label></div><button className="primary" onClick={onCreate}><Plus size={15}/>Создать КТП</button></section>
  <section className="import-card"><div className="import-icon"><FileSpreadsheet size={22}/></div><div className="import-copy"><strong>Загрузить план из Excel</strong><span>{importStatus || (importName ? `Выбран файл: ${importName}` : "Файл будет загружен в выбранный КТП")}</span></div><a className="download-button" href="/ktp-template.xlsx" download="ШАБЛОН КТП.xlsx"><Download size={16}/>Скачать шаблон</a><label className="upload-button"><Upload size={16}/>{importName ? "Выбрать другой" : "Загрузить .xlsx"}<input type="file" accept=".xlsx,.xls" onChange={e=>onImport(e.target.files?.[0])}/></label></section>
  <section className="panel"><div className="panel-head plan-heading"><div><strong>{activeCurriculum?.name || "КТП"}</strong><div className="plan-title-meta"><span>{rows.reduce((sum,r)=>sum+r.hours,0)} часа · {visibleModules.length} модуля · {rows.filter(r=>r.criterion).length} оцениваний</span><div className="plan-title-classes">{attachedClasses.length ? attachedClasses.map(item => <b className="class-chip" key={item.id}>{item.name}</b>) : <span>Классы не привязаны</span>}</div></div></div><div className="panel-actions"><button className="secondary" onClick={onAddClass}><Pencil size={15}/>Классы</button><button className="secondary" onClick={onAddModule}><Plus size={15}/>Добавить модуль</button><button className="primary" onClick={onAdd}><Plus size={15}/>Добавить урок</button></div></div>
  <div className="table-scroll"><table className="plan-table"><thead><tr><th>№</th><th>Тема урока</th><th>Часы</th><th>Оценивание</th><th>Название оценивания</th><th>Домашнее задание</th><th>Время</th><th>Действия</th></tr></thead><tbody>{visibleModules.map((module,moduleIndex)=>{const moduleRows=rows.filter(row=>row.unit===module);return <React.Fragment key={module}><tr className="module-row"><td colSpan={8}><div className="module-bar"><div><span>Модуль</span><strong>{module}</strong><small>{moduleRows.length} уроков</small></div><div className="module-actions"><button className="icon-button" onClick={()=>onMoveModule(module,-1)} disabled={moduleIndex===0} aria-label={`Переместить модуль ${module} вверх`} title="Переместить модуль вверх"><ArrowUp size={15}/></button><button className="icon-button" onClick={()=>onMoveModule(module,1)} disabled={moduleIndex===visibleModules.length-1} aria-label={`Переместить модуль ${module} вниз`} title="Переместить модуль вниз"><ArrowDown size={15}/></button></div></div></td></tr>{moduleRows.map((r,rowIndex)=>{const displayIndex=orderedRows.findIndex(item=>item.id===r.id);return <tr key={r.id}><td>{displayIndex+1}</td><td><strong>{r.topic || "Без темы"}</strong></td><td>{r.hours}</td><td>{r.criterion ? <b className={`criterion-badge criterion-${r.criterion.toLowerCase()}`}>{r.criterion}</b> : <span className="muted">Нет</span>}</td><td>{r.assessmentName || <span className="dash">—</span>}</td><td>{r.homework || <span className="dash">—</span>}</td><td><span className="time"><Clock3 size={14}/>{r.homeworkMinutes || 0} мин</span></td><td><div className="row-actions"><button className="icon-button" onClick={()=>onMove(r.id,-1)} disabled={rowIndex===0} aria-label={`Переместить ${r.topic} вверх`} title="Переместить вверх"><ArrowUp size={15}/></button><button className="icon-button" onClick={()=>onMove(r.id,1)} disabled={rowIndex===moduleRows.length-1} aria-label={`Переместить ${r.topic} вниз`} title="Переместить вниз"><ArrowDown size={15}/></button><button className="icon-button" onClick={()=>onEdit(r)} aria-label={`Изменить ${r.topic}`} title="Изменить"><Pencil size={15}/></button><button className="icon-button danger-button" onClick={()=>onDelete(r.id)} aria-label={`Удалить ${r.topic}`} title="Удалить урок"><Trash2 size={15}/></button></div></td></tr>})}</React.Fragment>})}</tbody></table></div></section></>;
}

function Schedule({ weekOffset, setWeekOffset, lessons, className }: { weekOffset:number; setWeekOffset:(n:number)=>void; lessons: Lesson[]; className:string }) {
  const months = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const weekdays = ["Понедельник","Вторник","Среда","Четверг","Пятница"];
  const monday = useMemo(() => new Date(Date.UTC(2026, 8, 7 + weekOffset * 7)), [weekOffset]);
  const days = useMemo(() => weekdays.map((name, index) => {
    const date = new Date(monday); date.setUTCDate(monday.getUTCDate() + index);
    return { name, date, iso: date.toISOString().slice(0,10) };
  }), [monday]);
  const sunday = new Date(monday); sunday.setUTCDate(monday.getUTCDate() + 6);
  const weekLabel = `${monday.getUTCDate()} ${months[monday.getUTCMonth()]} — ${sunday.getUTCDate()} ${months[sunday.getUTCMonth()]} 2026`;
  const times = ["08:30", "09:20", "10:25", "11:15", "12:20", "13:10", "14:15", "15:05", "16:10"];
  return <section className="schedule-section"><div className="week-control"><button className="icon-button" onClick={()=>setWeekOffset(weekOffset-1)} aria-label="Предыдущая неделя"><ChevronLeft size={18}/></button><div><strong>{weekLabel}</strong><span>{weekOffset === 0 ? "Текущая неделя" : "Учебная неделя"}</span></div><button className="icon-button" onClick={()=>setWeekOffset(weekOffset+1)} aria-label="Следующая неделя"><ChevronRight size={18}/></button><button className="today" onClick={()=>setWeekOffset(0)}>Сегодня</button></div>
  <div className="schedule-grid"><div className="corner">Урок</div>{days.map((day,i)=><div className={`day-head ${i===1&&weekOffset===0?"today-col":""}`} key={day.iso}><strong>{day.name}</strong><span>{day.date.getUTCDate()} {months[day.date.getUTCMonth()]}</span></div>)}
  {times.map((time,lessonIndex)=><React.Fragment key={time}><div className="lesson-time"><strong>{lessonIndex+1}</strong><span>{time}</span></div>{days.map((day,dayIndex)=>{ const slot = dayIndex===1 ? lessonIndex+1 : dayIndex===3 ? lessonIndex-5 : -1; const lesson = (slot===1||slot===2) ? lessons.filter(l=>l.isoDate===day.iso)[slot-1] : undefined; return <div className={`schedule-cell ${dayIndex===1&&weekOffset===0?"today-col":""}`} key={day.iso}>{lesson && <div className="lesson-card"><span>{className} · Физика {lesson.criterion && `· ${lesson.criterion}`}</span><strong>{lesson.topic}</strong><small>Кабинет 3.14</small></div>}</div>})}</React.Fragment>)}</div></section>;
}

function Modal({ title, children, onClose, onSave }: { title:string; children:React.ReactNode; onClose:()=>void; onSave:()=>void }) {
  return <div className="modal" role="dialog" aria-modal="true"><button className="backdrop" onClick={onClose} aria-label="Закрыть"/><div className="modal-card"><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose}><X size={17}/></button></div>{children}<div className="modal-actions"><button className="secondary" onClick={onClose}>Отмена</button><button className="primary" onClick={onSave}><Save size={16}/>Сохранить</button></div></div></div>;
}

function LessonDialog({ lesson, className, onClose, onSave }: { lesson:Lesson; className:string; onClose:()=>void; onSave:(l:Lesson)=>void }) {
  const [draft,setDraft]=useState(lesson);
  const changeCriterion = (criterion: string) => {
    const hasAutomaticName = !draft.assessmentName || draft.assessmentName === "Формирующая работа" || draft.assessmentName.startsWith("Оценивание по критерию ");
    const defaultName = criterion ? (criterion === "F" ? "Формирующая работа" : `Оценивание по критерию ${criterion}`) : "";
    setDraft({ ...draft, criterion, assessmentName: hasAutomaticName ? defaultName : draft.assessmentName });
  };
  return <Modal title={`Урок · ${lesson.date}`} onClose={onClose} onSave={()=>onSave(draft)}><div className="lesson-badge">{className} · Физика · {lesson.weekday === "вт" ? "1–2 урок" : "8–9 урок"}</div><div className="field-row"><label className="field">Тип оценивания<select value={draft.criterion} onChange={event => changeCriterion(event.target.value)}><option value="">Нет оценивания</option><option value="A">Критерий A</option><option value="B">Критерий B</option><option value="C">Критерий C</option><option value="D">Критерий D</option><option value="BC">Критерии B и C</option><option value="F">F — формирующее</option></select></label><label className="field">Название оценивания<input value={draft.assessmentName || ""} placeholder="Например, Лабораторная работа" onChange={event => setDraft({ ...draft, assessmentName: event.target.value })}/></label></div><label className="field">Тема урока<textarea value={draft.topic} onChange={e=>setDraft({...draft,topic:e.target.value})}/></label><label className="field">Домашнее задание<textarea value={draft.homework} onChange={e=>setDraft({...draft,homework:e.target.value})}/></label><div className="field-row"><label className="field">Сдать к<input type="date" value={dateToIso(draft.homeworkDueDate)} onChange={e=>setDraft({...draft,homeworkDueDate:isoToDate(e.target.value)})}/></label><label className="field">Длительность ДЗ, мин<input type="number" min="0" step="5" value={draft.homeworkMinutes} onChange={e=>setDraft({...draft,homeworkMinutes:Math.max(0,Number(e.target.value))})}/></label></div></Modal>;
}

function PlanDialog({ row, setRow, modules, onClose, onSave }: { row:PlanRow; setRow:(r:PlanRow)=>void; modules:string[]; onClose:()=>void; onSave:()=>void }) {
  return <Modal title="Урок КТП" onClose={onClose} onSave={onSave}><label className="field">Модуль<select value={row.unit} onChange={e=>setRow({...row,unit:e.target.value})}>{modules.map(module=><option key={module} value={module}>{module}</option>)}</select></label><label className="field">Тема<input autoFocus value={row.topic} onChange={e=>setRow({...row,topic:e.target.value})}/></label><div className="field-row"><label className="field">Число уроков<input type="number" min="1" value={row.hours} onChange={e=>setRow({...row,hours:Number(e.target.value)})}/></label><label className="field">Время на ДЗ, мин<input type="number" min="0" value={row.homeworkMinutes} onChange={e=>setRow({...row,homeworkMinutes:Number(e.target.value)})}/></label></div><label className="field">Оценивание<select value={row.criterion} onChange={e=>setRow({...row,criterion:e.target.value,assessmentName:e.target.value ? (e.target.value === "F" ? "Формирующая работа" : `Критерий ${e.target.value}`) : ""})}><option value="">Нет</option><option value="A">Критерий A</option><option value="B">Критерий B</option><option value="C">Критерий C</option><option value="D">Критерий D</option><option value="BC">Критерии B и C</option><option value="F">F — формирующее</option></select></label>{row.criterion&&<label className="field">Название оценивания<input value={row.assessmentName} onChange={e=>setRow({...row,assessmentName:e.target.value})}/></label>}<label className="field">Домашнее задание<textarea value={row.homework} onChange={e=>setRow({...row,homework:e.target.value})}/></label></Modal>;
}

function ModuleDialog({ name, setName, onClose, onSave }: { name:string; setName:(value:string)=>void; onClose:()=>void; onSave:()=>void }) {
  return <Modal title="Добавить модуль" onClose={onClose} onSave={onSave}><label className="field">Название модуля<input autoFocus value={name} placeholder="Например, Оптика" onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();onSave()}}}/></label></Modal>;
}

function CurriculumDialog({ draft, setDraft, classes, onClose, onSave }: { draft:NewCurriculum; setDraft:(value:NewCurriculum)=>void; classes:SchoolClass[]; onClose:()=>void; onSave:()=>void }) {
  const toggleClass = (id: string) => setDraft({ ...draft, classIds: draft.classIds.includes(id) ? draft.classIds.filter(item => item !== id) : [...draft.classIds, id] });
  const parallelClasses = classes.filter(item => item.level === draft.level);
  return <Modal title="Создать КТП" onClose={onClose} onSave={onSave}><label className="field">Название КТП<input autoFocus value={draft.name} placeholder="Например, Физика 8 · Базовый уровень" onChange={event => setDraft({ ...draft, name: event.target.value })}/></label><label className="field">Уровень изучения<select value={draft.level} onChange={event => setDraft({ ...draft, level: event.target.value, classIds: [] })}><option>8 класс</option><option>9 класс</option><option>10 класс</option><option>11 класс</option></select></label><fieldset className="class-field"><legend>Привязать классы этой параллели</legend><div className="class-options">{parallelClasses.map(item => <label className={draft.classIds.includes(item.id) ? "selected" : ""} key={item.id}><input type="checkbox" checked={draft.classIds.includes(item.id)} onChange={() => toggleClass(item.id)}/><span><b>{item.name}</b><small>{item.level}</small></span></label>)}</div>{!parallelClasses.length && <div className="class-empty">Для этой параллели пока нет классов</div>}</fieldset></Modal>;
}

function AddClassesDialog({ selected, setSelected, attached, classes, curricula, curriculumLevel, onClose, onSave }: { selected:string[]; setSelected:(value:string[])=>void; attached:string[]; classes:SchoolClass[]; curricula:Curriculum[]; curriculumLevel:string; onClose:()=>void; onSave:()=>void }) {
  const [filter, setFilter] = useState("");
  const toggleClass = (id: string) => setSelected(selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id]);
  const filteredClasses = classes.filter(item => item.level === curriculumLevel && `${item.name} ${item.level}`.toLowerCase().includes(filter.trim().toLowerCase()));
  return <Modal title="Классы КТП" onClose={onClose} onSave={onSave}><p className="modal-hint">Можно выбрать только классы параллели «{curriculumLevel}». Класс из другого КТП этой параллели будет перенесён.</p><label className="field class-search">Фильтр по классу<input value={filter} placeholder="Например, 9Ф" onChange={event => setFilter(event.target.value)}/></label><div className="class-options class-binding-options">{filteredClasses.map(item => {
    const isAttached = attached.includes(item.id);
    const linked = curricula.find(curriculum => curriculum.classIds.includes(item.id));
    const isSelected = selected.includes(item.id);
    const status = isAttached ? (isSelected ? "Добавлен" : "Будет убран") : isSelected ? "Будет добавлен" : linked ? `Сейчас: ${linked.name}` : item.level;
    return <label className={isSelected ? "selected" : ""} key={item.id}><input type="checkbox" checked={isSelected} onChange={() => toggleClass(item.id)}/><span><b>{item.name}</b><small>{status}</small></span></label>;
  })}</div>{!filteredClasses.length && <div className="class-empty">Классы не найдены</div>}</Modal>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
