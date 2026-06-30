import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Consistent data table. One header and row treatment across the admin. Wrap rows
 * in <THead>/<Th> and <TBody>/<TR>/<Td>. The container scrolls horizontally on
 * small screens.
 *
 *   <Table minWidth="min-w-[760px]">
 *     <THead><Th>Name</Th><Th>Status</Th></THead>
 *     <TBody>{rows.map(r => <TR key={r.id}><Td>{r.name}</Td><Td>{r.status}</Td></TR>)}</TBody>
 *   </Table>
 */
export function Table({ children, minWidth = "min-w-[640px]", className }: { children: ReactNode; minWidth?: string; className?: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200">
      <table className={cn("w-full border-collapse text-sm", minWidth, className)}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-navy-900 text-left text-white">
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("px-4 py-3 font-medium", className)}>{children}</th>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn("border-b border-neutral-100 last:border-0 hover:bg-neutral-50/60", className)}>{children}</tr>;
}

export function Td({ children, className, colSpan }: { children: ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cn("px-4 py-3 align-top text-slate-700", className)}>
      {children}
    </td>
  );
}

export function TableEmpty({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <TR className="hover:bg-transparent">
      <Td colSpan={colSpan} className="py-8 text-center text-slate-500">
        {children}
      </Td>
    </TR>
  );
}
