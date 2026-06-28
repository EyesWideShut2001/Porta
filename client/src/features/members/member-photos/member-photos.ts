import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AccountService } from '../../../core/services/account-service';
import { MemberService } from '../../../core/services/member-service';
import { Member, Photo } from '../../../types/member';

type ExistingPhotoDraft = Photo & {
  draftId: string;
  kind: 'existing';
};

type NewPhotoDraft = {
  draftId: string;
  kind: 'new';
  file: File;
  url: string;
};

type PhotoDraftItem = ExistingPhotoDraft | NewPhotoDraft;

@Component({
  selector: 'app-member-photos',
  imports: [],
  templateUrl: './member-photos.html',
  styleUrl: './member-photos.css',
})
export class MemberPhotos implements OnInit, OnDestroy {
  protected memberService = inject(MemberService);
  protected accountService = inject(AccountService);
  private route = inject(ActivatedRoute);
  private memberId: string | null = null;
  private nextDraftId = 0;

  protected photos = signal<Photo[]>([]);
  protected draftPhotos = signal<PhotoDraftItem[]>([]);
  protected editingPhotos = signal(false);
  protected loading = signal(false);
  protected photoErrors = signal<string[]>([]);
  protected draggedDraftIndex = signal<number | null>(null);
  protected dropTargetDraftIndex = signal<number | null>(null);

  protected readonly minPhotos = 2;
  protected readonly maxPhotos = 8;

  protected isCurrentUser = computed(() => {
    return this.accountService.currentUser()?.id === this.memberService.member()?.id;
  });

  protected draftNewCount = computed(() => {
    return this.draftPhotos().filter((photo) => photo.kind === 'new').length;
  });

  protected draftDeleteCount = computed(() => {
    const keptPhotoIds = new Set(
      this.draftPhotos()
        .filter((photo): photo is ExistingPhotoDraft => photo.kind === 'existing')
        .map((photo) => photo.id),
    );

    return this.photos().filter((photo) => !keptPhotoIds.has(photo.id)).length;
  });

  protected draftOrderChanged = computed(() => {
    const persistedIds = this.photos().map((photo) => photo.id);
    const draftExistingIds = this.draftPhotos()
      .filter((photo): photo is ExistingPhotoDraft => photo.kind === 'existing')
      .map((photo) => photo.id);

    return draftExistingIds.some((photoId, index) => photoId !== persistedIds[index]);
  });

  protected hasDraftChanges = computed(() => {
    return (
      this.draftNewCount() > 0 ||
      this.draftDeleteCount() > 0 ||
      this.draftOrderChanged()
    );
  });

  ngOnInit(): void {
    this.memberId = this.route.parent?.snapshot.paramMap.get('id') ?? null;
    void this.reloadPhotos();
  }

  enterPhotoEditMode() {
    if (!this.isCurrentUser() || this.loading()) return;

    this.photoErrors.set([]);
    this.resetDraftFromPhotos();
    this.editingPhotos.set(true);
  }

  cancelPhotoEditMode() {
    if (this.loading()) return;

    this.photoErrors.set([]);
    this.editingPhotos.set(false);
    this.resetDraftFromPhotos();
  }

  openPhotoPicker(input: HTMLInputElement) {
    if (!this.editingPhotos() || this.loading() || this.draftPhotos().length >= this.maxPhotos) return;

    input.click();
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    if (!this.editingPhotos() || files.length === 0 || this.draftPhotos().length >= this.maxPhotos) {
      return;
    }

    const availableSlots = this.maxPhotos - this.draftPhotos().length;
    const selectedPhotos: NewPhotoDraft[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name} is not an image file.`);
        continue;
      }

      if (selectedPhotos.length >= availableSlots) {
        errors.push(`You can upload up to ${this.maxPhotos} photos.`);
        break;
      }

      selectedPhotos.push({
        draftId: this.createDraftId('new'),
        kind: 'new',
        file,
        url: URL.createObjectURL(file),
      });
    }

    if (selectedPhotos.length > 0) {
      this.draftPhotos.update((photos) => [...photos, ...selectedPhotos]);
    }

    this.photoErrors.set(errors);
  }

  removeDraftPhoto(draftId: string) {
    if (this.loading() || this.draftPhotos().length <= this.minPhotos) return;

    const photo = this.draftPhotos().find((item) => item.draftId === draftId);
    if (!photo) return;

    if (photo.kind === 'new') {
      URL.revokeObjectURL(photo.url);
    }

    this.draftPhotos.update((photos) => photos.filter((item) => item.draftId !== draftId));
  }

  onDraftPhotoDragStart(event: DragEvent, index: number) {
    if (!this.editingPhotos() || this.loading()) return;

    this.draggedDraftIndex.set(index);
    this.dropTargetDraftIndex.set(index);

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
    }
  }

  onDraftPhotoDragOver(event: DragEvent, index: number) {
    const draggedIndex = this.draggedDraftIndex();
    if (!this.editingPhotos() || this.loading() || draggedIndex === null || draggedIndex === index) return;

    event.preventDefault();
    event.stopPropagation();
    this.dropTargetDraftIndex.set(index);

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDraftPhotoDrop(event: DragEvent, index: number) {
    event.preventDefault();
    event.stopPropagation();

    const draggedIndex = this.draggedDraftIndex();
    if (draggedIndex !== null) {
      this.reorderDraftPhoto(draggedIndex, index);
    }

    this.clearDraftDragState();
  }

  onDraftPhotoDragEnd() {
    this.clearDraftDragState();
  }

  async savePhotoChanges() {
    if (!this.editingPhotos() || this.loading()) return;

    const validationError = this.getDraftValidationError();
    if (validationError) {
      this.photoErrors.set([validationError]);
      return;
    }

    if (!this.hasDraftChanges()) {
      this.editingPhotos.set(false);
      return;
    }

    this.loading.set(true);
    this.photoErrors.set([]);

    try {
      const draft = this.draftPhotos();
      const { photoOrder, newPhotos } = this.getPhotoUpdatePayload(draft);
      const updatedPhotos = await firstValueFrom(this.memberService.updatePhotos(photoOrder, newPhotos));
      const orderedPhotos = this.orderPhotos(updatedPhotos);

      this.photos.set(orderedPhotos);
      this.syncPrimaryPhoto(orderedPhotos[0] ?? null);
      this.editingPhotos.set(false);
      this.resetDraftFromPhotos();
    } catch (error: any) {
      console.log('Error saving photo changes: ', error);
      this.photoErrors.set([this.getErrorMessage(error)]);
      await this.reloadPhotos();
      this.resetDraftFromPhotos();
    } finally {
      this.loading.set(false);
    }
  }

  private async reloadPhotos() {
    if (!this.memberId) return;

    const photos = await firstValueFrom(this.memberService.getMemberPhotos(this.memberId));
    const orderedPhotos = this.orderPhotos(photos);
    this.photos.set(orderedPhotos);
    this.syncPrimaryPhoto(orderedPhotos[0] ?? null);

    if (!this.editingPhotos()) {
      this.resetDraftFromPhotos();
    }
  }

  private reorderDraftPhoto(fromIndex: number, toIndex: number) {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= this.draftPhotos().length ||
      toIndex >= this.draftPhotos().length
    ) {
      return;
    }

    this.draftPhotos.update((photos) => {
      const nextPhotos = [...photos];
      const [photo] = nextPhotos.splice(fromIndex, 1);
      nextPhotos.splice(toIndex, 0, photo);
      return nextPhotos;
    });
  }

  private getPhotoUpdatePayload(draft: PhotoDraftItem[]) {
    const newPhotoDrafts = draft.filter((photo): photo is NewPhotoDraft => photo.kind === 'new');
    const newPhotoIndexes = new Map(
      newPhotoDrafts.map((photo, index) => [photo.draftId, index]),
    );

    const photoOrder = draft.map((photo) => {
      if (photo.kind === 'existing') return `existing:${photo.id}`;

      const newPhotoIndex = newPhotoIndexes.get(photo.draftId);
      if (newPhotoIndex === undefined) {
        throw new Error('Could not resolve the final photo order');
      }

      return `new:${newPhotoIndex}`;
    });

    return {
      photoOrder,
      newPhotos: newPhotoDrafts.map((photo) => photo.file),
    };
  }

  private getDraftValidationError() {
    const photoCount = this.draftPhotos().length;

    if (photoCount < this.minPhotos) {
      return `You must keep at least ${this.minPhotos} photos.`;
    }

    if (photoCount > this.maxPhotos) {
      return `You can upload up to ${this.maxPhotos} photos.`;
    }

    return null;
  }

  private resetDraftFromPhotos() {
    this.revokeNewDraftUrls();
    this.clearDraftDragState();
    this.draftPhotos.set(
      this.photos().map((photo) => ({
        ...photo,
        draftId: this.createDraftId(`existing-${photo.id}`),
        kind: 'existing',
      })),
    );
  }

  private revokeNewDraftUrls() {
    for (const photo of this.draftPhotos()) {
      if (photo.kind === 'new') {
        URL.revokeObjectURL(photo.url);
      }
    }
  }

  private syncPrimaryPhoto(photo: Photo | null) {
    if (this.isCurrentUser()) {
      this.accountService.updateCurrentUser({ imageUrl: photo?.url });
    }

    this.memberService.member.update(
      (member) =>
        ({
          ...member,
          imageUrl: photo?.url,
        }) as Member,
    );
  }

  private orderPhotos(photos: Photo[]) {
    return [...photos].sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
  }

  private getErrorMessage(error: any) {
    if (typeof error?.error === 'string') return error.error;
    if (typeof error?.message === 'string') return error.message;

    return 'Problem saving photo changes';
  }

  private createDraftId(prefix: string) {
    this.nextDraftId += 1;
    return `${prefix}-${this.nextDraftId}`;
  }

  private clearDraftDragState() {
    this.draggedDraftIndex.set(null);
    this.dropTargetDraftIndex.set(null);
  }

  ngOnDestroy(): void {
    this.revokeNewDraftUrls();
  }
}
