import { publicProcedure, router } from "./_core/trpc";
import { promises as fs } from "fs";
import path from "path";

/**
 * Router per MIO Agent
 * - Gestione log degli agenti
 * - Monitoraggio operazioni
 * - Stato task e job
 */
export const mioAgentRouter = router({
  // Recupera tutti i log dalla cartella server/logs/
  getLogs: publicProcedure.query(async () => {
    try {
      const logsDir = path.join(process.cwd(), "server", "logs");
      
      // Verifica se la directory esiste
      try {
        await fs.access(logsDir);
      } catch {
        // Se la directory non esiste, restituisci array vuoto
        return [];
      }

      // Leggi tutti i file nella directory
      const files = await fs.readdir(logsDir);
      
      // Filtra solo i file .json
      const jsonFiles = files.filter(file => file.endsWith(".json"));

      // Leggi e parsa ogni file JSON
      const logs = await Promise.all(
        jsonFiles.map(async (filename) => {
          const filePath = path.join(logsDir, filename);
          const stats = await fs.stat(filePath);
          const content = await fs.readFile(filePath, "utf-8");
          
          try {
            const parsedContent = JSON.parse(content);
            
            return {
              filename,
              timestamp: parsedContent.timestamp || stats.mtime.toISOString(),
              content: parsedContent,
              size: stats.size,
              modified: stats.mtime.toISOString(),
            };
          } catch (parseError) {
            // Se il JSON non è valido, restituisci il contenuto raw
            return {
              filename,
              timestamp: stats.mtime.toISOString(),
              content: { raw: content, parseError: "Invalid JSON" },
              size: stats.size,
              modified: stats.mtime.toISOString(),
            };
          }
        })
      );

      // Ordina per timestamp decrescente (più recenti prima)
      logs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return logs;
    } catch (error) {
      console.error("Error reading logs:", error);
      throw new Error("Failed to read logs");
    }
  }),

  // Crea un nuovo log
  createLog: publicProcedure
    .input((val: unknown) => {
      if (
        typeof val === "object" &&
        val !== null &&
        "agent" in val &&
        "action" in val &&
        "status" in val
      ) {
        return val as {
          agent: string;
          action: string;
          status: "success" | "error" | "warning" | "info";
          message?: string;
          details?: Record<string, any>;
        };
      }
      throw new Error("Invalid input: must include agent, action, and status");
    })
    .mutation(async ({ input }) => {
      try {
        const logsDir = path.join(process.cwd(), "server", "logs");

        // Crea la directory se non esiste
        try {
          await fs.access(logsDir);
        } catch {
          await fs.mkdir(logsDir, { recursive: true });
        }

        // Genera filename univoco con timestamp
        const timestamp = new Date().toISOString();
        const sanitizedAgent = input.agent.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
        const sanitizedAction = input.action.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
        const filename = `${sanitizedAgent}-${sanitizedAction}-${Date.now()}.json`;
        const filePath = path.join(logsDir, filename);

        // Crea oggetto log completo
        const logData = {
          timestamp,
          agent: input.agent,
          action: input.action,
          status: input.status,
          message: input.message || "",
          details: input.details || {},
        };

        // Scrivi il file JSON
        await fs.writeFile(filePath, JSON.stringify(logData, null, 2), "utf-8");

        return {
          success: true,
          filename,
          timestamp,
          message: "Log created successfully",
        };
      } catch (error) {
        console.error("Error creating log:", error);
        throw new Error("Failed to create log");
      }
    }),

  // Recupera un singolo log per filename
  getLogByFilename: publicProcedure
    .input((val: unknown) => {
      if (typeof val === "string") return val;
      throw new Error("Input must be a string");
    })
    .query(async ({ input: filename }) => {
      try {
        const logsDir = path.join(process.cwd(), "server", "logs");
        const filePath = path.join(logsDir, filename);

        // Verifica che il file esista e sia nella directory logs
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) {
          throw new Error("Not a file");
        }

        const content = await fs.readFile(filePath, "utf-8");
        const parsedContent = JSON.parse(content);

        return {
          filename,
          timestamp: parsedContent.timestamp || stats.mtime.toISOString(),
          content: parsedContent,
          size: stats.size,
          modified: stats.mtime.toISOString(),
        };
      } catch (error) {
        console.error("Error reading log file:", error);
        throw new Error("Failed to read log file");
      }
    }),
});
