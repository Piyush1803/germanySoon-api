import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('appointments')
export class Appointment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({name:'full_name', default: null})
    name: string;

    @Column({name:'user_email', default: null})
    email: string;

    @Column({ name:'start_time', type: 'datetime' })
    startTime: Date;

    @Column({ name:'end_time', type: 'datetime' })
    endTime: Date;

    @Column({ name:'is_booked' ,default: false })
    isBooked: boolean;

    @Column({ name:'meet_link', nullable: true, default: null })
    meetLink: string;

    @CreateDateColumn({default: null})
    createdAt: Date;

    @UpdateDateColumn({default: null})
    updatedAt: Date;
}

