import { addFileContributor, getFileContributors, removeFileContributor, updateFileContributor } from "./contributors";
import { backupDatabase, getDatabaseInfo } from "./database";
import { bulkCopyMove, copyFile, moveFile } from "./fileCopyMove";
import { filePreflight } from "./filePreflight";
import { emptyTrash, removeFile, restoreFile } from "./fileTrash";
import { createFolder, updateFile } from "./fileUpdate";
import { deleteOption, saveOption } from "./options";
import { deleteRole, saveRole } from "./roles";
import { executeSQL, getDatabaseSchema } from "./sql-runner";
import { bulkDeleteTask, deleteTask, updateTask } from "./task";
import { addUser, updateUser, deleteUser } from "./users";
import { getUserUssageSummary } from "./ussageSummary";

const functions = {
    getFileContributors,
    addFileContributor,
    updateFileContributor,
    removeFileContributor,
    copyFile,
    moveFile,
    bulkCopyMove,
    filePreflight,
    removeFile,
    restoreFile,
    emptyTrash,
    createFolder,
    updateFile,
    getUserUssageSummary,
    addUser,
    updateUser,
    deleteUser,
    updateTask,
    deleteTask,
    bulkDeleteTask,
    saveRole,
    deleteRole,
    saveOption,
    deleteOption,
    executeSQL,
    getDatabaseSchema,
    backupDatabase,
    getDatabaseInfo
} as const;

export type FunctionName = keyof typeof functions;

// Extract argument type (defaults to void if no args)
export type FunctionProps<N extends FunctionName> = Parameters<typeof functions[N]>[0];

// Extract return type
export type FunctionReturn<N extends FunctionName> = Awaited<ReturnType<typeof functions[N]>>;

export default functions;
