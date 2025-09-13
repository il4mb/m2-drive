import { useMyPermission } from '@/hooks/useMyPermission';
import { Button } from '@mui/material';
import Link from 'next/link';

export interface ActivitiesButtonProps {

}
export default function ActivitiesButton({  }: ActivitiesButtonProps) {
    
    const canAccessActivities = useMyPermission("can-access-activity-report");
    if(!canAccessActivities) return null;

    return (
        <Button LinkComponent={Link} href='/activities-report'>
            Lihat Semua
        </Button>
    );
}