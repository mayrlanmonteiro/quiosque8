import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const formatNumber = (value: number) => {
  return new Intl.NumberFormat("pt-BR").format(value);
};

export const formatDate = (date: string | Date, pattern: string = "dd/MM/yyyy") => {
  return format(new Date(date), pattern, { locale: ptBR });
};

export const formatDateTime = (date: string | Date) => {
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
};
