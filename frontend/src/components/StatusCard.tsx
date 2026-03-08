import { LucideIcon } from "lucide-react";

interface StatusCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subValue?: string;
  iconColor?: string;
}

const StatusCard = ({ icon: Icon, label, value, subValue, iconColor = "text-primary" }: StatusCardProps) => {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
      <div className={`rounded-lg bg-secondary p-2.5 ${iconColor}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-card-foreground">
          {value}
          {subValue && <span className="font-normal text-muted-foreground"> {subValue}</span>}
        </p>
      </div>
    </div>
  );
};

export default StatusCard;
